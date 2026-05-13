import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { eq, sql, inArray, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { users } from "../../lib/db/schema/users";
import {
  providerProfiles,
  providerCategories,
  providerDocuments,
} from "../../lib/db/schema/providers";
import {
  serviceCategories,
  services,
  servicePrices,
} from "../../lib/db/schema/services";
import { verificationCodes as verifyCodes } from "../../lib/db/schema/users";
import { wallets } from "../../lib/db/schema/payments";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const client = postgres(url, { ssl: "require", prepare: false, max: 5 });
export const db = drizzle(client);

export async function dbClose() {
  await client.end();
}

/**
 * Wipe any test users matching these emails. Cascades take care of
 * everything tied to them. Run before each fresh test run.
 */
export async function deleteTestUsers(emails: string[]) {
  if (!emails.length) return;
  await db
    .delete(users)
    .where(
      sql`lower(${users.email}) in (${sql.join(
        emails.map((e) => sql`lower(${e})`),
        sql`, `,
      )})`,
    );
}

/**
 * Read the latest unredeemed verify code for an email + purpose. Test
 * harness shortcut so we don't need real SMTP.
 */
export async function latestVerifyCode(
  email: string,
  purpose: "email_verify" | "password_reset",
): Promise<string | null> {
  const [row] = await db
    .select({ code: verifyCodes.code })
    .from(verifyCodes)
    .where(
      and(
        eq(verifyCodes.email, email.toLowerCase()),
        eq(verifyCodes.purpose, purpose),
      ),
    )
    .orderBy(sql`${verifyCodes.createdAt} desc`)
    .limit(1);
  return row?.code ?? null;
}

/**
 * Force-mark a user as email-verified. Bypass for tests that don't care
 * about verification UI.
 */
export async function markVerified(email: string) {
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.email, email.toLowerCase()));
}

/**
 * Seed an admin row directly. Tests that need to drive admin UI assume
 * one already exists — re-creating per test would be slow.
 */
export async function ensureAdmin(
  email = "admin.e2e@example.com",
  password = "Test1234!",
) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(password, 10);
  const [u] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: "admin",
      country: "AU",
      name: "E2E Admin",
      emailVerifiedAt: new Date(),
    })
    .returning();
  return u;
}

/**
 * Build an approved provider end-to-end (user + profile + categories +
 * service + price + docs). Skips the 5-step wizard UI so tests of the
 * customer-side discovery don't need to drive provider onboarding via
 * UI — that's covered by the smoke script + the dedicated wizard tests.
 */
export async function seedApprovedProvider(opts: {
  email: string;
  name: string;
  password?: string;
}) {
  const password = opts.password ?? "Test1234!";
  const passwordHash = await bcrypt.hash(password, 10);
  const [u] = await db
    .insert(users)
    .values({
      email: opts.email,
      passwordHash,
      // Every account is both consumer and provider; "is an active provider"
      // comes from the providerProfiles row below, not users.role.
      role: "customer",
      country: "AU",
      name: opts.name,
      emailVerifiedAt: new Date(),
    })
    .returning();
  const [profile] = await db
    .insert(providerProfiles)
    .values({
      userId: u.id,
      bio: `${opts.name} — seeded by E2E.`,
      addressLine: "45 Park Rd, Sydney NSW 2010",
      serviceRadiusKm: 15,
      onboardingStatus: "approved",
      submittedAt: new Date(),
      approvedAt: new Date(),
    })
    .returning();
  await db.insert(providerCategories).values([
    { providerId: profile.id, category: "cleaning" },
  ]);
  await db.insert(wallets).values({
    providerId: profile.id,
    balancePending: "0.00",
    balanceAvailable: "0.00",
    currency: "AUD",
  });
  // Mark all 3 doc types as approved so compliance state is clean.
  for (const t of ["police_check", "first_aid", "insurance"] as const) {
    await db.insert(providerDocuments).values({
      providerId: profile.id,
      type: t,
      fileUrl: `/uploads/seed/${t}.pdf`,
      documentNumber: `${t.toUpperCase()}-E2E`,
      status: "approved",
      expiresAt: new Date(Date.now() + 365 * 86_400_000),
    });
  }
  return { user: u, profile };
}

/**
 * Make sure the cleaning category + a known service + AU price exist
 * — the smoke script's category seed pattern, replayed here so the
 * UI listing has data to render.
 */
export async function ensureCatalog() {
  const [cat] = await db
    .select()
    .from(serviceCategories)
    .where(eq(serviceCategories.code, "cleaning"))
    .limit(1);
  if (!cat) {
    await db.insert(serviceCategories).values({
      code: "cleaning",
      iconKey: "spray-can",
      sortOrder: 1,
    });
  }
  const [svc] = await db
    .select()
    .from(services)
    .where(eq(services.code, "e2e_clean_2h"))
    .limit(1);
  if (svc) return svc;
  const [created] = await db
    .insert(services)
    .values({
      categoryCode: "cleaning",
      code: "e2e_clean_2h",
      durationMin: 120,
    })
    .returning();
  await db.insert(servicePrices).values({
    serviceId: created.id,
    country: "AU",
    basePrice: "100.00",
    taxRate: "0.1000",
    currency: "AUD",
  });
  return created;
}

/**
 * Wallet count for the assertion section.
 */
export async function walletsForProvider(providerId: string) {
  return db
    .select()
    .from(wallets)
    .where(eq(wallets.providerId, providerId));
}

/**
 * Inverse of `ensureCatalog` — clean the e2e-only service rows. Called
 * during teardown.
 */
export async function cleanCatalog() {
  await db.delete(services).where(eq(services.code, "e2e_clean_2h"));
}

export { eq, inArray };
