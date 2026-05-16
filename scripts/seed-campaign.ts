/**
 * Seed the active fundraising campaign.
 *
 * MVP only ever has one row with isActive=true. Re-running upserts on slug.
 *
 *   npx tsx scripts/seed-campaign.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { campaigns } from "../lib/db/schema/donations";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");
const client = postgres(url, {
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  prepare: false,
  max: 1,
});
const db = drizzle(client);

async function main() {
  const slug = "silverconnect-2026-q2";
  const [row] = await db
    .insert(campaigns)
    .values({
      slug,
      title: "让每一位长者都被听见",
      goalAmount: "250000.00",
      currency: "AUD",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: campaigns.slug,
      set: {
        title: "让每一位长者都被听见",
        goalAmount: "250000.00",
        currency: "AUD",
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning({ id: campaigns.id, slug: campaigns.slug });

  console.log(`✓ campaign upserted: ${row.slug} (${row.id})`);
}

main()
  .then(() => client.end())
  .catch((err) => {
    console.error(err);
    client.end();
    process.exit(1);
  });
