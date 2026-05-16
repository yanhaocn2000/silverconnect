/**
 * Seed E2E review fixtures: one address + a spread of bookings (and one
 * dispute) for the e2e-suite customer, so the dynamic [id] pages
 * (booking detail / pay / success / feedback / dispute, provider job
 * detail, admin dispute detail) render real content during the design
 * review instead of 404-ing on missing rows.
 *
 * Idempotent-ish: deletes prior e2e fixtures for the customer first.
 *
 *   npx tsx scripts/seed-e2e-fixtures.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");
const client = postgres(url, {
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  prepare: false,
  max: 1,
});
const db = drizzle(client);

const CUSTOMER_EMAIL = "e2e-suite@example.com";

async function main() {
  // ----- resolve FKs -----
  const [customer] = await db.execute(
    sql`SELECT id FROM users WHERE email = ${CUSTOMER_EMAIL} LIMIT 1`,
  );
  if (!customer) throw new Error(`customer ${CUSTOMER_EMAIL} not found — run register flow first`);
  const customerId = customer.id as string;

  const [service] = await db.execute(
    sql`SELECT id, duration_min FROM services WHERE enabled = true ORDER BY sort_order LIMIT 1`,
  );
  if (!service) throw new Error("no enabled service — run db:seed first");
  const serviceId = service.id as string;
  const durationMin = service.duration_min as number;

  const [provider] = await db.execute(
    sql`SELECT id FROM provider_profiles WHERE onboarding_status = 'approved' LIMIT 1`,
  );
  const providerId = (provider?.id as string) ?? null;

  const [price] = await db.execute(
    sql`SELECT base_price FROM service_prices WHERE service_id = ${serviceId} LIMIT 1`,
  );
  const basePrice = Number(price?.base_price ?? 80);
  const tax = +(basePrice * 0.1).toFixed(2);
  const total = +(basePrice + tax).toFixed(2);

  // ----- wipe prior e2e fixtures (dispute → bookings → address) -----
  await db.execute(sql`
    DELETE FROM disputes WHERE booking_id IN (
      SELECT id FROM bookings WHERE customer_id = ${customerId}
    )`);
  await db.execute(sql`DELETE FROM bookings WHERE customer_id = ${customerId}`);
  await db.execute(sql`DELETE FROM addresses WHERE user_id = ${customerId}`);

  // ----- address -----
  const [addr] = await db.execute(sql`
    INSERT INTO addresses (user_id, label, line1, city, state, postcode, country, is_default)
    VALUES (${customerId}, 'Home', '123 Bondi Rd', 'Bondi', 'NSW', '2026', 'AU', true)
    RETURNING id`);
  const addressId = addr.id as string;

  // ----- bookings: confirmed (future), completed (past), disputed -----
  const now = Date.now();
  const day = 86400000;
  const rows: Array<{ status: string; at: number }> = [
    { status: "confirmed", at: now + 2 * day },
    { status: "completed", at: now - 3 * day },
    { status: "disputed", at: now - 5 * day },
  ];
  const bookingIds: Record<string, string> = {};
  for (const r of rows) {
    const [b] = await db.execute(sql`
      INSERT INTO bookings
        (customer_id, provider_id, service_id, address_id, scheduled_at,
         duration_min, status, base_price, tax_amount, total_price, currency,
         confirmed_at, completed_at)
      VALUES
        (${customerId}, ${providerId}, ${serviceId}, ${addressId},
         ${new Date(r.at).toISOString()}, ${durationMin}, ${r.status}::booking_status,
         ${basePrice}, ${tax}, ${total}, 'AUD',
         ${r.status === "pending" ? null : new Date(now - 6 * day).toISOString()},
         ${r.status === "completed" || r.status === "disputed" ? new Date(r.at).toISOString() : null})
      RETURNING id`);
    bookingIds[r.status] = b.id as string;
  }

  // ----- dispute on the disputed booking -----
  await db.execute(sql`
    INSERT INTO disputes (booking_id, raised_by, status, reason)
    VALUES (${bookingIds.disputed}, ${customerId}, 'open',
            'Provider did not arrive at the scheduled time.')`);

  console.log("✅ E2E fixtures seeded:");
  console.log(`   address      ${addressId}`);
  console.log(`   confirmed    ${bookingIds.confirmed}`);
  console.log(`   completed    ${bookingIds.completed}`);
  console.log(`   disputed     ${bookingIds.disputed}`);
  await client.end();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
