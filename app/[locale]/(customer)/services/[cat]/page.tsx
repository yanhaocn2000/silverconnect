import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { ProviderCard } from "@/components/domain/ProviderCard";
import { CURRENCY_SYMBOL, TAX_ABBR } from "@/components/domain/country";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";
import { EmptyState } from "@/components/domain/PageStates";
import { db } from "@/lib/db";
import {
  serviceCategories,
  services,
  servicePrices,
} from "@/lib/db/schema/services";
import {
  providerProfiles,
  providerCategories,
  providerBadges,
} from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { reviews } from "@/lib/db/schema/reviews";

type CatKey = "cleaning" | "cooking" | "garden" | "personalCare" | "repair";

// Filter pills are visual placeholders for now — wiring them through to
// the SQL query is a Wave 7 polish (needs language fields on
// provider_profiles + a real distance metric).
const FILTER_KEYS = [
  "rating",
  "distance",
  "language",
  "weekend",
  "female",
  "firstAid",
] as const;

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

export default async function ProvidersByCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; cat: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, cat } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("providers");
  const tCat = await getTranslations("categories");
  const country = await getCountry();
  const session = await getSession();
  const isZh = locale.startsWith("zh");
  const sym = CURRENCY_SYMBOL[country];
  const taxAbbr = TAX_ABBR[country];

  // Validate category exists.
  const [validCat] = await db
    .select({ code: serviceCategories.code })
    .from(serviceCategories)
    .where(
      and(
        eq(serviceCategories.code, cat),
        eq(serviceCategories.enabled, true),
      ),
    )
    .limit(1);
  if (!validCat) notFound();

  const catName = tCat(cat as CatKey);

  // Hourly price window for this category.
  const priceRows = await db
    .select({
      basePrice: servicePrices.basePrice,
      durationMin: services.durationMin,
    })
    .from(services)
    .innerJoin(
      servicePrices,
      and(
        eq(servicePrices.serviceId, services.id),
        eq(servicePrices.country, country),
      ),
    )
    .where(
      and(
        eq(services.enabled, true),
        eq(services.categoryCode, cat),
      ),
    );
  let lo = Number.POSITIVE_INFINITY;
  let hi = 0;
  for (const r of priceRows) {
    const hr = (Number(r.basePrice) * 60) / Math.max(1, r.durationMin);
    lo = Math.min(lo, hr);
    hi = Math.max(hi, hr);
  }
  const hourlyLabel = Number.isFinite(lo)
    ? `${sym}${Math.round(lo)}–${Math.round(hi)}`
    : null;

  // Approved providers offering this category, with rating + count.
  const provs = await db
    .select({
      id: providerProfiles.id,
      userId: providerProfiles.userId,
      name: users.name,
      email: users.email,
      ratingAvg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      ratingCount: sql<number>`count(${reviews.id})::int`,
    })
    .from(providerProfiles)
    .innerJoin(
      providerCategories,
      eq(providerCategories.providerId, providerProfiles.id),
    )
    .leftJoin(users, eq(users.id, providerProfiles.userId))
    .leftJoin(
      reviews,
      and(
        eq(reviews.providerId, providerProfiles.id),
        eq(reviews.status, "published"),
      ),
    )
    .where(
      and(
        eq(providerProfiles.onboardingStatus, "approved"),
        eq(providerCategories.category, cat as never),
      ),
    )
    .groupBy(providerProfiles.id, users.name, users.email)
    .orderBy(
      desc(sql`avg(${reviews.rating})`),
      desc(sql`count(${reviews.id})`),
    )
    .limit(50);

  const verifiedIds =
    provs.length > 0
      ? new Set(
          (
            await db
              .select({ providerId: providerBadges.providerId })
              .from(providerBadges)
              .where(
                and(
                  inArray(
                    providerBadges.providerId,
                    provs.map((p) => p.id),
                  ),
                  eq(providerBadges.kind, "verified"),
                ),
              )
          ).map((r) => r.providerId),
        )
      : new Set<string>();

  // Cheapest hourly per provider (we use the category-level lo for now).
  const cheapestHourly = Number.isFinite(lo) ? Math.round(lo) : 0;

  return (
    <>
      <Header
        country={country}
        back
        signedIn={session.signedIn}
        initials={session.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-3 sm:pb-12"
      >
        <h1 className="text-h2">
          {isZh ? `${catName}（${country}）` : `${catName} (${country})`}
        </h1>
        {hourlyLabel && (
          <p className="mt-1 text-[14px] text-text-secondary">
            {isZh
              ? `${hourlyLabel}/小时（含 ${taxAbbr}）`
              : `${hourlyLabel}/h (incl. ${taxAbbr})`}
          </p>
        )}

        <div className="mt-4 -mx-5 flex gap-2 overflow-x-auto scrollbar-hide px-5 pb-1">
          {FILTER_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              disabled
              title="Filter wiring is a Wave 7 polish"
              className="inline-flex h-10 shrink-0 items-center rounded-pill border border-border bg-bg-surface px-3.5 text-small font-semibold text-text-primary opacity-60"
            >
              {t(`filters.${k}` as Parameters<typeof t>[0])}
            </button>
          ))}
          <button
            type="button"
            disabled
            className="inline-flex h-10 shrink-0 items-center rounded-pill border border-border bg-bg-surface px-3.5 text-small font-semibold text-text-primary opacity-60"
          >
            {t("sortRecommended")} ▾
          </button>
        </div>

        {provs.length === 0 ? (
          <div className="mt-6">
            <EmptyState title={t("noMatch")} />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {provs.map((p, i) => (
              <ProviderCard
                key={p.id}
                country={country}
                provider={{
                  id: p.id,
                  name: p.name || (p.email?.split("@")[0] ?? "Provider"),
                  initials: initialsOf(p.name, p.email ?? "?"),
                  hue: (i % 4) as 0 | 1 | 2 | 3,
                  rating: Number(p.ratingAvg) || 0,
                  reviews: Number(p.ratingCount) || 0,
                  distanceKm: "—",
                  pricePerHour: cheapestHourly,
                  verified: verifiedIds.has(p.id),
                  firstAid: false,
                }}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
