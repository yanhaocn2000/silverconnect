import { setRequestLocale, getTranslations } from "next-intl/server";
import { eq, and, sql } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import {
  C3HelperMei,
  C4CookZhang,
  C5GardenerTom,
  C6NurseAnna,
  C7FixerBob,
} from "@/components/illustrations";
import { fmtPriceRange } from "@/components/domain/country";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";
import { db } from "@/lib/db";
import {
  serviceCategories,
  services,
  servicePrices,
} from "@/lib/db/schema/services";
import {
  providerCategories,
  providerProfiles,
} from "@/lib/db/schema/providers";

type CatKey = "cleaning" | "cooking" | "garden" | "personalCare" | "repair";

const CHAR_BY_CODE: Record<string, React.ComponentType<{ size: number }>> = {
  cleaning: C3HelperMei,
  cooking: C4CookZhang,
  garden: C5GardenerTom,
  personalCare: C6NurseAnna,
  repair: C7FixerBob,
};

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("services");
  const tCat = await getTranslations("categories");
  const tTax = await getTranslations("tax.inclLine");
  const country = await getCountry();
  const session = await getSession();
  const isZh = locale.startsWith("zh");

  // Categories.
  const cats = await db
    .select({
      code: serviceCategories.code,
      sortOrder: serviceCategories.sortOrder,
    })
    .from(serviceCategories)
    .where(eq(serviceCategories.enabled, true))
    .orderBy(serviceCategories.sortOrder);

  // Hourly rate window per category (this country).
  const priceRows = await db
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

  const ranges = new Map<string, { lo: number; hi: number }>();
  for (const r of priceRows) {
    const hr = (Number(r.basePrice) * 60) / Math.max(1, r.durationMin);
    const cur = ranges.get(r.category);
    if (!cur) ranges.set(r.category, { lo: hr, hi: hr });
    else ranges.set(r.category, { lo: Math.min(cur.lo, hr), hi: Math.max(cur.hi, hr) });
  }

  // Approved-provider counts per category.
  const counts = await db
    .select({
      category: providerCategories.category,
      n: sql<number>`count(*)::int`,
    })
    .from(providerCategories)
    .innerJoin(
      providerProfiles,
      eq(providerProfiles.id, providerCategories.providerId),
    )
    .where(eq(providerProfiles.onboardingStatus, "approved"))
    .groupBy(providerCategories.category);
  const countMap = new Map<string, number>(
    counts.map((c) => [c.category as string, c.n]),
  );

  return (
    <>
      <Header
        country={country}
        signedIn={session.signedIn}
        initials={session.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-5 sm:pb-12"
      >
        <h1 className="text-[28px] font-extrabold md:text-[32px]">{t("title")}</h1>

        <div className="mt-4 flex items-start gap-2.5 rounded-md bg-brand-soft px-4 py-3 text-small text-brand-ink">
          <span aria-hidden>ℹ️</span>
          <span className="flex-1">{tTax(country)}</span>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {cats.map((c) => {
            const Char = CHAR_BY_CODE[c.code] ?? C3HelperMei;
            const range = ranges.get(c.code);
            const lo = range ? Math.round(range.lo) : 0;
            const hi = range ? Math.round(range.hi) : 0;
            const providerCount = countMap.get(c.code) ?? 0;
            return (
              <li key={c.code}>
                <Link
                  href={`/services/${c.code}`}
                  className="flex h-[200px] cursor-pointer items-center gap-4 rounded-lg border border-border bg-bg-surface p-4 transition-shadow hover:shadow-md"
                >
                  <span className="shrink-0">
                    <Char size={120} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[22px] font-bold text-text-primary">
                      {tCat(c.code as CatKey)}
                    </span>
                    <span className="mt-1.5 block text-[16px] leading-tight text-text-secondary">
                      {tCat(`${c.code}Desc` as Parameters<typeof tCat>[0])}
                    </span>
                    {range && (
                      <span className="mt-2.5 block text-[18px] font-bold text-brand-ink">
                        {fmtPriceRange(country, lo, hi)}
                        {isZh ? "/小时" : "/h"}
                      </span>
                    )}
                    <span className="mt-1 block text-[13px] text-text-tertiary tabular-nums">
                      {providerCount === 0
                        ? isZh
                          ? "暂无可服务者"
                          : "No providers yet"
                        : isZh
                          ? `${providerCount} 位可服务者`
                          : `${providerCount} provider${providerCount === 1 ? "" : "s"}`}
                    </span>
                  </span>
                  <ChevronRight
                    size={24}
                    className="shrink-0 text-text-tertiary"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
