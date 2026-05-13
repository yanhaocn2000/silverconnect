/**
 * Seed a deterministic AU provider account for the provider-compliance e2e
 * tests (`e2e/provider-compliance.spec.ts`). Idempotent — re-running upserts.
 *
 *   npx tsx scripts/seed-e2e-provider.ts
 *
 * Then run the e2e with:
 *   PW_PROVIDER_EMAIL=e2e-provider@silverconnect.test \
 *   PW_PROVIDER_PASSWORD=E2eTest123! \
 *   npx playwright test e2e/provider-compliance.spec.ts --project=chromium
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users } from "../lib/db/schema/users";
import { providerProfiles } from "../lib/db/schema/providers";

const EMAIL = process.env.PW_PROVIDER_EMAIL ?? "e2e-provider@silverconnect.test";
const PASSWORD = process.env.PW_PROVIDER_PASSWORD ?? "E2eTest123!";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");
const client = postgres(url, { ssl: "require", prepare: false, max: 1 });
const db = drizzle(client);

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, EMAIL))
    .limit(1);

  let userId: string;
  if (existing) {
    userId = existing.id;
    await db
      .update(users)
      .set({
        passwordHash,
        role: "customer",
        country: "AU",
        emailVerifiedAt: new Date(),
        name: "E2E Provider",
        updatedAt: new Date(),
        deletedAt: null,
      })
      .where(eq(users.id, userId));
    console.log(`Updated existing user ${EMAIL} (${userId})`);
  } else {
    const [created] = await db
      .insert(users)
      .values({
        email: EMAIL,
        passwordHash,
        role: "customer",
        country: "AU",
        emailVerifiedAt: new Date(),
        name: "E2E Provider",
      })
      .returning({ id: users.id });
    userId = created!.id;
    console.log(`Created user ${EMAIL} (${userId})`);
  }

  const [profile] = await db
    .select({ id: providerProfiles.id })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, userId))
    .limit(1);
  if (profile) {
    await db
      .update(providerProfiles)
      .set({
        onboardingStatus: "docs_review",
        submittedAt: new Date(),
        addressLine: "1 Test Street, Sydney NSW 2000",
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.id, profile.id));
    console.log(`Updated provider profile ${profile.id} -> docs_review`);
  } else {
    const [created] = await db
      .insert(providerProfiles)
      .values({
        userId,
        onboardingStatus: "docs_review",
        submittedAt: new Date(),
        addressLine: "1 Test Street, Sydney NSW 2000",
      })
      .returning({ id: providerProfiles.id });
    console.log(`Created provider profile ${created!.id} -> docs_review`);
  }

  console.log(`\nDone. Login: ${EMAIL} / ${PASSWORD}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
