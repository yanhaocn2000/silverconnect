import { NextResponse } from "next/server";
import { decodeIdToken, OAuth2RequestError } from "arctic";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { getGoogleClient } from "@/lib/auth/google-oauth";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { findUserByEmail, signInUser } from "@/lib/auth/server";

const STATE_COOKIE = "g_oauth_state";
const VERIFIER_COOKIE = "g_oauth_verifier";
const LOCALE_COOKIE = "g_oauth_locale";

interface GoogleClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

const DEFAULT_LOCALE = "en";

function readCookie(req: Request, name: string): string | undefined {
  return req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const locale = readCookie(req, LOCALE_COOKIE) || DEFAULT_LOCALE;

  const google = getGoogleClient();
  if (!google) {
    return redirectWith(origin, locale, "/auth/login?error=google_unconfigured");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");
  if (errParam || !code || !state) {
    return redirectWith(origin, locale, `/auth/login?error=google_${errParam || "missing"}`);
  }

  const storedState = readCookie(req, STATE_COOKIE);
  const verifier = readCookie(req, VERIFIER_COOKIE);

  if (!storedState || !verifier || storedState !== state) {
    return redirectWith(origin, locale, "/auth/login?error=google_state");
  }

  let claims: GoogleClaims;
  try {
    const tokens = await google.validateAuthorizationCode(code, verifier);
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch (err) {
    if (err instanceof OAuth2RequestError) {

      console.error("[google-oauth] token exchange failed:", err.message);
    } else {

      console.error("[google-oauth] token exchange error:", err);
    }
    return redirectWith(origin, locale, "/auth/login?error=google_exchange");
  }

  const email = claims.email?.toLowerCase().trim();
  if (!email || claims.email_verified === false) {
    return redirectWith(origin, locale, "/auth/login?error=google_email");
  }

  const existing = await findUserByEmail(email);
  let user;
  if (existing) {
    // First Google sign-in for an email that registered via password: mark
    // verified (Google has already verified it) and update name if blank.
    if (!existing.emailVerifiedAt || (!existing.name && claims.name)) {
      const [u] = await db
        .update(users)
        .set({
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
          name: existing.name ?? claims.name ?? null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      user = u;
    } else {
      user = existing;
    }
  } else {
    // Brand-new account from Google. Generate an unguessable password hash
    // so the row satisfies the NOT NULL constraint; the user can later set
    // a real password via "forgot password" if they want password sign-in.
    const placeholderHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
    const [u] = await db
      .insert(users)
      .values({
        email,
        passwordHash: placeholderHash,
        name: claims.name ?? null,
        avatarUrl: claims.picture ?? null,
        emailVerifiedAt: new Date(),
        role: "customer",
      })
      .returning();
    user = u;
  }

  await signInUser({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const homeByRole =
    user.role === "admin" ? "/admin" : user.role === "provider" ? "/provider" : "/home";
  const res = redirectWith(origin, locale, homeByRole);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(VERIFIER_COOKIE);
  res.cookies.delete(LOCALE_COOKIE);
  return res;
}

function redirectWith(origin: string, locale: string, path: string) {
  return NextResponse.redirect(new URL(`/${locale}${path}`, origin), { status: 302 });
}
