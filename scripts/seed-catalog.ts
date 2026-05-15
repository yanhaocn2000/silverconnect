/**
 * Seed service catalog (categories + services + per-country prices).
 *
 * Idempotent — re-running upserts on the natural keys (`code`, and
 * `(service_id, country)` for prices). Run after Phase 2 migration:
 *
 *   npx tsx scripts/seed-catalog.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
import {
  serviceCategories,
  services,
  servicePrices,
} from "../lib/db/schema/services";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");
const client = postgres(url, {
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  prepare: false,
  max: 1,
});
const db = drizzle(client);

interface Cat {
  code: string;
  iconKey: string;
  sortOrder: number;
}

interface Svc {
  code: string;
  categoryCode: string;
  durationMin: number;
  prices: { country: "AU" | "US" | "CA"; basePrice: string; taxRate: string; currency: string }[];
}

const CATEGORIES: Cat[] = [
  { code: "cleaning", iconKey: "spray-can", sortOrder: 1 },
  { code: "cooking", iconKey: "chef-hat", sortOrder: 2 },
  { code: "garden", iconKey: "sprout", sortOrder: 3 },
  { code: "personalCare", iconKey: "heart-pulse", sortOrder: 4 },
  { code: "repair", iconKey: "wrench", sortOrder: 5 },
];

// AU = 10% GST, US = 8% sales tax (sample blended rate), CA = 13% HST (Ontario default).
const SERVICES: Svc[] = [
  {
    code: "cleaning_basic_2h",
    categoryCode: "cleaning",
    durationMin: 120,
    prices: [
      { country: "AU", basePrice: "110.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "180.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "120.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
  {
    code: "cleaning_deep_3h",
    categoryCode: "cleaning",
    durationMin: 180,
    prices: [
      { country: "AU", basePrice: "195.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "320.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "210.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
  {
    code: "cleaning_seasonal_4h",
    categoryCode: "cleaning",
    durationMin: 240,
    prices: [
      { country: "AU", basePrice: "280.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "460.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "300.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
  {
    code: "cooking_meal_prep_2h",
    categoryCode: "cooking",
    durationMin: 120,
    prices: [
      { country: "AU", basePrice: "90.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "150.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "100.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
  {
    code: "cooking_batch_3h",
    categoryCode: "cooking",
    durationMin: 180,
    prices: [
      { country: "AU", basePrice: "140.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "230.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "150.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
  {
    code: "garden_lawn_1h",
    categoryCode: "garden",
    durationMin: 60,
    prices: [
      { country: "AU", basePrice: "80.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "130.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "85.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
  {
    code: "garden_full_3h",
    categoryCode: "garden",
    durationMin: 180,
    prices: [
      { country: "AU", basePrice: "150.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "240.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "165.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
  {
    code: "personalCare_companionship_2h",
    categoryCode: "personalCare",
    durationMin: 120,
    prices: [
      { country: "AU", basePrice: "85.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "140.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "90.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
  {
    code: "personalCare_bathing_1h",
    categoryCode: "personalCare",
    durationMin: 60,
    prices: [
      { country: "AU", basePrice: "60.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "100.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "65.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
  {
    code: "repair_handyman_1h",
    categoryCode: "repair",
    durationMin: 60,
    prices: [
      { country: "AU", basePrice: "75.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "120.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "80.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
  {
    code: "repair_handyman_3h",
    categoryCode: "repair",
    durationMin: 180,
    prices: [
      { country: "AU", basePrice: "210.00", taxRate: "0.1000", currency: "AUD" },
      { country: "US", basePrice: "340.00", taxRate: "0.0800", currency: "USD" },
      { country: "CA", basePrice: "230.00", taxRate: "0.1300", currency: "CAD" },
    ],
  },
];

async function main() {
  // Categories
  for (const cat of CATEGORIES) {
    await db
      .insert(serviceCategories)
      .values({ code: cat.code, iconKey: cat.iconKey, sortOrder: cat.sortOrder })
      .onConflictDoUpdate({
        target: serviceCategories.code,
        set: {
          iconKey: cat.iconKey,
          sortOrder: cat.sortOrder,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`✅ ${CATEGORIES.length} categories upserted`);

  // Services + prices
  let svcCount = 0;
  let priceCount = 0;
  for (const svc of SERVICES) {
    const [row] = await db
      .insert(services)
      .values({
        code: svc.code,
        categoryCode: svc.categoryCode,
        durationMin: svc.durationMin,
      })
      .onConflictDoUpdate({
        target: services.code,
        set: {
          categoryCode: svc.categoryCode,
          durationMin: svc.durationMin,
          updatedAt: new Date(),
        },
      })
      .returning({ id: services.id });
    svcCount++;
    for (const p of svc.prices) {
      await db
        .insert(servicePrices)
        .values({
          serviceId: row.id,
          country: p.country,
          basePrice: p.basePrice,
          taxRate: p.taxRate,
          currency: p.currency,
        })
        .onConflictDoUpdate({
          target: [servicePrices.serviceId, servicePrices.country],
          set: {
            basePrice: p.basePrice,
            taxRate: p.taxRate,
            currency: p.currency,
            updatedAt: new Date(),
          },
        });
      priceCount++;
    }
  }
  console.log(`✅ ${svcCount} services upserted`);
  console.log(`✅ ${priceCount} country prices upserted`);

  // Verify
  const totals = await db.execute(sql`
    select
      (select count(*)::int from service_categories) as cats,
      (select count(*)::int from services) as svcs,
      (select count(*)::int from service_prices) as prices
  `);
  console.log("\nDB totals:", totals[0]);

  await client.end();
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  await client.end();
  process.exit(1);
});
