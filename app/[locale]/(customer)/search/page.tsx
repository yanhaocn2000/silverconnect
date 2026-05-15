import { setRequestLocale, getTranslations } from "next-intl/server";
import { eq, and, or, ilike, sql, inArray } from "drizzle-orm";
import { Search as SearchIcon } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";
import { db } from "@/lib/db";
import { providerProfiles, providerCategories } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { reviews } from "@/lib/db/schema/reviews";
import { serviceCategories } from "@/lib/db/schema/services";

const HELP_ARTICLES = [
  { slug: "how-to-book", titleEn: "How to book a service", titleZh: "如何预订服务" },
  { slug: "refund-policy", titleEn: "Refund policy", titleZh: "退款政策" },
  { slug: "safety", titleEn: "Staying safe", titleZh: "如何保持安全" },
  { slug: "payment", titleEn: "Accepted payment methods", titleZh: "支持的支付方式" },
  { slug: "family", titleEn: "Adding family members", titleZh: "添加家人成员" },
];

function score(needle: string, haystack: string): number {
  const a = needle.toLowerCase().trim();
  const b = haystack.toLowerCase();
  if (!a) return 0;
  if (b === a) return 100;
  if (b.startsWith(a)) return 80;
  if (b.includes(a)) return 60;
  return 0;
}

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const session = await getSession();
  const country = await getCountry();
  const t = await getTranslations("search");
  const tCategories = await getTranslations("categories");

  const q = typeof sp.q === "string" ? sp.q : "";
  const isZh = locale.startsWith("zh");

  // Categories matching the query (translate label, then score).
  const catRows = q
    ? await db
        .select({ code: serviceCategories.code })
        .from(serviceCategories)
        .where(eq(serviceCategories.enabled, true))
    : [];
  const services = q
    ? catRows
        .map((c) => {
          const label = tCategories(
            c.code as Parameters<typeof tCategories>[0],
          );
          return { key: c.code, label, s: score(q, label) };
        })
        .filter((c) => c.s > 0)
        .sort((a, b) => b.s - a.s)
    : [];

  // Providers: match by name/email/bio. Also bring in providers whose
  // categories match the query — match-by-category needs the matched
  // category codes from above, then a join.
  const matchedCatCodes = services.map((s) => s.key);
  type ProviderHit = {
    id: string;
    name: string;
    initials: string;
    categories: string[];
    rating: number;
    reviews: number;
    s: number;
  };
  let providers: ProviderHit[] = [];
  if (q) {
    const like = `%${q}%`;
    const providerRows = await db
      .select({
        id: providerProfiles.id,
        userName: users.name,
        userEmail: users.email,
        bio: providerProfiles.bio,
      })
      .from(providerProfiles)
      .leftJoin(users, eq(users.id, providerProfiles.userId))
      .where(
        and(
          eq(providerProfiles.onboardingStatus, "approved"),
          or(
            ilike(users.name, like),
            ilike(users.email, like),
            ilike(providerProfiles.bio, like),
          ),
        ),
      )
      .limit(40);

    let categoryHitIds: string[] = [];
    if (matchedCatCodes.length) {
      const catProvRows = await db
        .selectDistinct({ providerId: providerCategories.providerId })
        .from(providerCategories)
        .innerJoin(
          providerProfiles,
          eq(providerProfiles.id, providerCategories.providerId),
        )
        .where(
          and(
            eq(providerProfiles.onboardingStatus, "approved"),
            inArray(
              providerCategories.category,
              matchedCatCodes as (
                | "cleaning"
                | "cooking"
                | "garden"
                | "personalCare"
                | "repair"
              )[],
            ),
          ),
        )
        .limit(40);
      categoryHitIds = catProvRows.map((r) => r.providerId);
    }

    const allIds = Array.from(
      new Set([
        ...providerRows.map((p) => p.id),
        ...categoryHitIds,
      ]),
    );
    if (allIds.length) {
      const catLookup = await db
        .select({
          providerId: providerCategories.providerId,
          category: providerCategories.category,
        })
        .from(providerCategories)
        .where(inArray(providerCategories.providerId, allIds));
      const catByProv = new Map<string, string[]>();
      for (const r of catLookup) {
        const arr = catByProv.get(r.providerId) ?? [];
        arr.push(r.category as string);
        catByProv.set(r.providerId, arr);
      }

      const ratingRows = await db
        .select({
          providerId: reviews.providerId,
          avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
          n: sql<number>`count(*)::int`,
        })
        .from(reviews)
        .where(
          and(
            eq(reviews.status, "published"),
            inArray(reviews.providerId, allIds),
          ),
        )
        .groupBy(reviews.providerId);
      const ratingByProv = new Map(
        ratingRows.map((r) => [r.providerId, { avg: Number(r.avg), n: r.n }]),
      );

      // Re-fetch user info for category-only hits not in providerRows.
      const known = new Map(providerRows.map((p) => [p.id, p]));
      const missingIds = allIds.filter((id) => !known.has(id));
      if (missingIds.length) {
        const extra = await db
          .select({
            id: providerProfiles.id,
            userName: users.name,
            userEmail: users.email,
            bio: providerProfiles.bio,
          })
          .from(providerProfiles)
          .leftJoin(users, eq(users.id, providerProfiles.userId))
          .where(inArray(providerProfiles.id, missingIds));
        for (const e of extra) known.set(e.id, e);
      }

      providers = allIds
        .map((id) => {
          const p = known.get(id)!;
          const cats = catByProv.get(id) ?? [];
          const dispName =
            p.userName || (p.userEmail ?? "Provider").split("@")[0];
          const nameScore = score(q, dispName);
          const bioScore = p.bio ? score(q, p.bio) : 0;
          const catScore = cats.some((c) => matchedCatCodes.includes(c))
            ? 70
            : 0;
          const rating = ratingByProv.get(id);
          return {
            id,
            name: dispName,
            initials: initialsOf(p.userName, p.userEmail ?? "?"),
            categories: cats,
            rating: rating?.avg ?? 0,
            reviews: rating?.n ?? 0,
            s: Math.max(nameScore, bioScore, catScore),
          };
        })
        .filter((p) => p.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 20);
    }
  }

  const articles = q
    ? HELP_ARTICLES.map((a) => ({
        ...a,
        s: score(q, isZh ? a.titleZh : a.titleEn),
      }))
        .filter((a) => a.s > 0)
        .sort((a, b) => b.s - a.s)
    : [];

  const empty =
    q && providers.length === 0 && services.length === 0 && articles.length === 0;

  return (
    <>
      <Header
        country={country}
        signedIn={session.signedIn}
        initials={session.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("title")}</h1>

        <form method="get" className="mt-4 flex gap-2">
          <label htmlFor="q" className="sr-only">
            {t("title")}
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("placeholder")}
            autoComplete="off"
            className="block h-touch-btn flex-1 rounded-2xl border-[1.5px] border-border bg-bg-surface px-4 text-body text-text-primary placeholder:text-text-placeholder focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand-soft"
          />
          <button
            type="submit"
            className="inline-flex h-touch-btn items-center gap-2 rounded-md bg-brand px-5 text-[15px] font-bold text-white"
          >
            <SearchIcon size={16} aria-hidden />
            {t("button")}
          </button>
        </form>

        {!q && (
          <p className="mt-6 text-center text-[14px] text-text-tertiary">
            {t("submitToSearch")}
          </p>
        )}

        {q && (
          <h2 className="mt-6 text-[18px] font-bold">
            {t("resultsFor", { q })}
          </h2>
        )}

        {empty && (
          <p className="mt-4 rounded-lg border border-dashed border-border-strong bg-bg-surface px-5 py-8 text-center text-[14px] text-text-secondary">
            {t("noResults")}
          </p>
        )}

        {providers.length > 0 && (
          <section className="mt-5">
            <h3 className="text-[14px] font-bold uppercase tracking-wide text-text-tertiary">
              {t("sectionProviders")}
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {providers.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/providers/${p.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-3"
                  >
                    <ProviderAvatar size={44} hue={1} initials={p.initials} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold">{p.name}</p>
                      <p className="text-[13px] text-text-tertiary">
                        {p.categories
                          .map((c) =>
                            tCategories(
                              c as Parameters<typeof tCategories>[0],
                            ),
                          )
                          .join(" · ") || "—"}
                        {p.reviews > 0 && (
                          <>
                            {" · ★ "}
                            <span className="tabular-nums">
                              {p.rating.toFixed(1)}
                            </span>{" "}
                            ({p.reviews})
                          </>
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {services.length > 0 && (
          <section className="mt-5">
            <h3 className="text-[14px] font-bold uppercase tracking-wide text-text-tertiary">
              {t("sectionServices")}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {services.map((c) => (
                <li key={c.key}>
                  <Link
                    href={`/services/${c.key}`}
                    className="inline-flex h-10 items-center rounded-pill border-[1.5px] border-brand bg-brand-soft px-4 text-[14px] font-semibold text-brand"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {articles.length > 0 && (
          <section className="mt-5">
            <h3 className="text-[14px] font-bold uppercase tracking-wide text-text-tertiary">
              {t("sectionHelp")}
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {articles.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/help/${a.slug}`}
                    className="block rounded-lg border border-border bg-bg-surface p-3 text-[14px] font-semibold text-text-primary"
                  >
                    {isZh ? a.titleZh : a.titleEn}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
