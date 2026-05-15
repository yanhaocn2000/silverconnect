import { NextResponse } from "next/server";
import { generateState, generateCodeVerifier } from "arctic";
import { getGoogleClient, GOOGLE_OAUTH_SCOPES } from "@/lib/auth/google-oauth";

const STATE_COOKIE = "g_oauth_state";
const VERIFIER_COOKIE = "g_oauth_verifier";
const LOCALE_COOKIE = "g_oauth_locale";
const COOKIE_MAX_AGE = 10 * 60; // 10 min — covers slow user-agents

/**
 * Step 1 of Google OAuth: generate state + PKCE verifier, stash them in
 * short-lived HTTP-only cookies, then 302 the browser to Google's
 * consent screen.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ locale: string }> },
) {
  const { locale } = await ctx.params;
  const url = new URL(req.url);

  const google = getGoogleClient();
  if (!google) {
    const target = new URL(`/${locale}/auth/login?error=google_unconfigured`, url.origin);
    return NextResponse.redirect(target, { status: 302 });
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const authUrl = google.createAuthorizationURL(state, codeVerifier, GOOGLE_OAUTH_SCOPES);

  const res = NextResponse.redirect(authUrl.toString(), { status: 302 });
  const secure = process.env.NODE_ENV === "production";
  const baseCookie = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
  res.cookies.set(STATE_COOKIE, state, baseCookie);
  res.cookies.set(VERIFIER_COOKIE, codeVerifier, baseCookie);
  res.cookies.set(LOCALE_COOKIE, locale, baseCookie);
  return res;
}
