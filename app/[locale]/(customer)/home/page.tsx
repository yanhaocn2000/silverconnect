import { setRequestLocale, getTranslations } from "next-intl/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { S1TeaTime } from "@/components/illustrations";
import { ProviderCard } from "@/components/domain/ProviderCard";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { CURRENCY_SYMBOL } from "@/components/domain/country";
import { EmptyState } from "@/components/domain/PageStates";
import type { CountryCode } from "@/components/layout";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { serviceCategories, services, servicePrices } from "@/lib/db/schema/services";
import {
  providerProfiles,
  providerCategories,
  providerBadges,
} from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { bookings } from "@/lib/db/schema/bookings";
import { reviews } from "@/lib/db/schema/reviews";
import { getCurrentUser } from "@/lib/auth/server";

type CatKey =
  | "cleaning"
  | "cooking"
  | "garden"
  | "personalCare"
  | "repair";

// Decorative chip tones per category (each picks a different chip-*
// token from the new design system, so dark mode flips them too).
const CAT_TILE: Record<string, { tile: string; emoji: string }> = {
  cleaning:     { tile: "bg-[var(--chip-blue-bg)] text-[var(--chip-blue-fg)]",   emoji: "🧹" },
  cooking:      { tile: "bg-[var(--chip-amber-bg)] text-[var(--chip-amber-fg)]", emoji: "🍳" },
  garden:       { tile: "bg-[var(--chip-green-bg)] text-[var(--chip-green-fg)]", emoji: "🌿" },
  personalCare: { tile: "bg-[var(--chip-pink-bg)] text-[var(--chip-pink-fg)]",   emoji: "🤝" },
  repair:       { tile: "bg-[var(--chip-purple-bg)] text-[var(--chip-purple-fg)]", emoji: "🔧" },
};

function priceFromHourly(country: CountryCode, baseHr: number, locale: string) {
  const sym = CURRENCY_SYMBOL[country];
  return locale.startsWith("zh") ? `${sym}${baseHr}/小时起` : `from ${sym}${baseHr}/h`;
}

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

export default async function CustomerHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tCat = await getTranslations("categories");
  const tCommon = await getTranslations("common");
  const country = await getCountry();
  const me = await getCurrentUser();
  const greetingName = me?.name ?? me?.email.split("@")[0] ?? tCommon("guest");

  // ----- Categories with min hourly price (per country) -----
  const catRows = await db
    .select({
      code: serviceCategories.code,
      sortOrder: serviceCategories.sortOrder,
    })
    .from(serviceCategories)
    .where(eq(serviceCategories.enabled, true))
    .orderBy(serviceCategories.sortOrder);

  // Cheapest hourly rate per category for the user's country.
  // Hourly = base_price / (duration_min / 60).
  const minHourlyRows = await db
    .select({
      category: services.categoryCode,
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
    .where(eq(services.enabled, true));
  const minHourlyByCategory = new Map<string, number>();
  for (const r of minHourlyRows) {
    const hr = (Number(r.basePrice) * 60) / Math.max(1, r.durationMin);
    const prev = minHourlyByCategory.get(r.category);
    if (prev === undefined || hr < prev) {
      minHourlyByCategory.set(r.category, hr);
    }
  }

  // ----- Recently booked: last 4 distinct providers from this user's bookings -----
  const recentProviders: {
    providerProfileId: string;
    providerName: string;
    serviceCategory: string | null;
    initials: string;
  }[] = [];
  if (me) {
    const recentBookings = await db
      .select({
        providerId: bookings.providerId,
        serviceCategory: services.categoryCode,
        providerName: users.name,
        providerEmail: users.email,
      })
      .from(bookings)
      .leftJoin(services, eq(services.id, bookings.serviceId))
      .leftJoin(
        providerProfiles,
        eq(providerProfiles.id, bookings.providerId),
      )
      .leftJoin(users, eq(users.id, providerProfiles.userId))
      .where(eq(bookings.customerId, me.id))
      .orderBy(desc(bookings.createdAt))
      .limit(20);
    const seen = new Set<string>();
    for (const b of recentBookings) {
      if (!b.providerId || seen.has(b.providerId)) continue;
      seen.add(b.providerId);
      recentProviders.push({
        providerProfileId: b.providerId,
        providerName:
          b.providerName || (b.providerEmail?.split("@")[0] ?? "Provider"),
        serviceCategory: b.serviceCategory,
        initials: initialsOf(b.providerName, b.providerEmail ?? "?"),
      });
      if (recentProviders.length >= 4) break;
    }
  }

  // ----- Recommended: top approved provider by avg rating -----
  // (single-row featured card; multi-row carousel can be a Wave 7 polish)
  const recommended = await db
    .select({
      id: providerProfiles.id,
      userId: providerProfiles.userId,
      providerName: users.name,
      providerEmail: users.email,
      ratingAvg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      ratingCount: sql<number>`count(${reviews.id})::int`,
    })
    .from(providerProfiles)
    .leftJoin(users, eq(users.id, providerProfiles.userId))
    .leftJoin(
      reviews,
      and(
        eq(reviews.providerId, providerProfiles.id),
        eq(reviews.status, "published"),
      ),
    )
    .where(eq(providerProfiles.onboardingStatus, "approved"))
    .groupBy(providerProfiles.id, users.name, users.email)
    .orderBy(desc(sql`avg(${reviews.rating})`), desc(sql`count(${reviews.id})`))
    .limit(1);

  // Recommended provider's cheapest hourly (across the categories they offer).
  let recommendedHourly = 0;
  if (recommended.length) {
    const provCats = await db
      .select({ category: providerCategories.category })
      .from(providerCategories)
      .where(eq(providerCategories.providerId, recommended[0].id));
    const codes = provCats.map((c) => c.category as string);
    if (codes.length) {
      const min = Array.from(minHourlyByCategory.entries()).filter(([k]) =>
        codes.includes(k),
      );
      const cheapest = min
        .map(([, v]) => v)
        .reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
      if (Number.isFinite(cheapest)) recommendedHourly = Math.round(cheapest);
    }
  }

  // `verified` badge comes from providerBadges (not from onboardingStatus).
  let recommendedVerified = false;
  if (recommended.length) {
    const [badge] = await db
      .select({ kind: providerBadges.kind })
      .from(providerBadges)
      .where(
        and(
          eq(providerBadges.providerId, recommended[0].id),
          eq(providerBadges.kind, "verified"),
        ),
      )
      .limit(1);
    recommendedVerified = !!badge;
  }

  return (
    <>
      <Header
        country={country}
        signedIn={!!me}
        initials={me?.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content pb-[120px] md:max-w-[1080px] md:pb-12"
      >
        <div className="flex flex-col gap-6 px-5 pt-5 md:gap-7 md:px-8 md:pt-8">
          {/* Greeting illu block */}
          <section className="flex items-center gap-4 rounded-lg bg-gradient-to-br from-brand-soft to-bg-surface p-[22px] md:p-9">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-[30px] font-extrabold leading-tight text-text-primary md:text-[36px]">
                {t("greeting", { name: greetingName })}
              </h1>
              <p className="mt-2 text-body text-text-secondary">
                {t("prompt")}
              </p>
            </div>
            <div className="shrink-0">
              <S1TeaTime width={120} height={90} className="md:scale-[1.4]" />
            </div>
          </section>

          {/* Search */}
          <form action={`/${locale}/search`} method="get" className="flex gap-2">
            <input
              type="search"
              name="q"
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchAria")}
              className="block h-14 flex-1 rounded-2xl border-[1.5px] border-border bg-bg-surface px-4 text-body text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand-soft"
            />
          </form>

          {/* Categories */}
          <section>
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-[22px] font-extrabold leading-tight text-text-primary">
                {t("categoriesTitle")}
              </h2>
              <Link
                href="/services"
                className="text-small font-semibold text-brand-ink hover:underline"
              >
                {t("seeAll")} →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {catRows.map((c) => {
                const meta = CAT_TILE[c.code] ?? { tile: "bg-bg-surface-2 text-text-secondary", emoji: "•" };
                const hr = minHourlyByCategory.get(c.code);
                return (
                  <Link
                    key={c.code}
                    href={`/services/${c.code}`}
                    className="group flex min-h-[132px] flex-col items-start gap-2.5 rounded-lg border border-border bg-bg-surface p-[18px] transition-shadow hover:shadow-md md:min-h-[148px]"
                  >
                    <span
                      aria-hidden
                      className={`flex h-11 w-11 items-center justify-center rounded-[14px] text-2xl ${meta.tile}`}
                    >
                      {meta.emoji}
                    </span>
                    <span className="text-body font-bold text-text-primary md:text-h3">
                      {tCat(c.code as CatKey)}
                    </span>
                    {hr ? (
                      <span className="text-small text-text-secondary">
                        {priceFromHourly(country, Math.round(hr), locale)}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Recent + Recommended side-by-side on desktop */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.4fr_1fr] md:gap-5">
            {me && recentProviders.length > 0 ? (
              <section>
                <div className="mb-3.5 flex items-center justify-between">
                  <h2 className="text-[22px] font-extrabold text-text-primary">
                    {t("recentTitle")}
                  </h2>
                  <Link
                    href="/bookings"
                    className="text-small font-semibold text-brand-ink hover:underline"
                  >
                    {t("seeAll")} →
                  </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 md:flex-col md:overflow-visible">
                  {recentProviders.map((p) => (
                    <article
                      key={p.providerProfileId}
                      className="flex h-[120px] min-w-[240px] items-center gap-3 rounded-lg border border-border bg-bg-surface p-3.5 md:min-w-0"
                    >
                      <ProviderAvatar size={64} hue={0} initials={p.initials} />
                      <div className="flex-1">
                        <p className="text-body font-bold text-text-primary">
                          {p.providerName}
                        </p>
                        <p className="mt-0.5 text-small text-text-secondary">
                          {p.serviceCategory
                            ? tCat(p.serviceCategory as CatKey)
                            : ""}
                        </p>
                        <Link
                          href={`/providers/${p.providerProfileId}`}
                          className="mt-2 inline-flex rounded-sm border-[1.5px] border-brand px-2.5 py-1 text-[13px] font-semibold text-brand"
                        >
                          {t("bookAgain")}
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {recommended.length > 0 ? (
              <section>
                <div className="mb-3.5 flex items-center justify-between">
                  <h2 className="text-[22px] font-extrabold text-text-primary">
                    {t("recommendedTitle")}
                  </h2>
                  <span className="rounded-pill bg-brand-soft px-2.5 py-1 text-[12px] font-bold text-brand-ink">
                    {t("editorPick")}
                  </span>
                </div>
                <ProviderCard
                  country={country}
                  provider={{
                    id: recommended[0].id,
                    name:
                      recommended[0].providerName ||
                      (recommended[0].providerEmail?.split("@")[0] ?? "Provider"),
                    initials: initialsOf(
                      recommended[0].providerName,
                      recommended[0].providerEmail ?? "?",
                    ),
                    hue: 0,
                    rating: Number(recommended[0].ratingAvg) || 0,
                    reviews: Number(recommended[0].ratingCount) || 0,
                    distanceKm: "—",
                    pricePerHour: recommendedHourly || 0,
                    verified: recommendedVerified,
                    firstAid: false,
                  }}
                />
              </section>
            ) : me ? (
              <EmptyState title={t("noRecent").replace(/^· /, "")} />
            ) : null}
          </div>

          {!me && (
            <p className="text-small font-semibold text-brand-ink">
              {t("welcomeFirst")}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
