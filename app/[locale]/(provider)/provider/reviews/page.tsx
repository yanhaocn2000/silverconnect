import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { Star } from "lucide-react";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { ReplyReviewModal } from "@/components/domain/ReplyReviewModal";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { reviews, reviewReplies } from "@/lib/db/schema/reviews";
import { providerProfiles } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { getCurrentUser } from "@/lib/auth/server";

const DIM_KEYS = [
  "dimPunctual",
  "dimProfessional",
  "dimClean",
  "dimAttitude",
  "dimPrice",
] as const;

async function replyAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const reviewId = String(formData.get("id") ?? "");
  const body = String(formData.get("reply") ?? "").trim();
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!reviewId || body.length < 5) {
    nextRedirect(`/${locale}/provider/reviews?error=invalid`);
  }
  const [profile] = await db
    .select({ id: providerProfiles.id })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, me.id))
    .limit(1);
  if (!profile) nextRedirect(`/${locale}/provider/register`);
  const [r] = await db
    .select({ id: reviews.id, providerId: reviews.providerId })
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1);
  if (!r || r.providerId !== profile.id) {
    nextRedirect(`/${locale}/provider/reviews?error=forbidden`);
  }
  await db
    .insert(reviewReplies)
    .values({ reviewId, providerId: profile.id, body })
    .onConflictDoUpdate({
      target: reviewReplies.reviewId,
      set: { body, updatedAt: new Date() },
    });
  nextRedirect(`/${locale}/provider/reviews?replied=${reviewId}`);
}

export default async function ProviderReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const country = await getCountry();
  const t = await getTranslations("provider");
  const tCommon = await getTranslations("common");

  const filterRaw = Array.isArray(sp.stars) ? sp.stars[0] : sp.stars;
  const filter = filterRaw && /^[1-5]$/.test(filterRaw) ? Number(filterRaw) : 0;

  const [profile] = await db
    .select({ id: providerProfiles.id })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, me.id))
    .limit(1);
  if (!profile) nextRedirect(`/${locale}/provider/register`);

  const conditions = [
    eq(reviews.providerId, profile.id),
    eq(reviews.status, "published"),
  ];
  if (filter) conditions.push(eq(reviews.rating, filter));

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      customerId: reviews.customerId,
      customerName: users.name,
      customerEmail: users.email,
    })
    .from(reviews)
    .leftJoin(users, eq(users.id, reviews.customerId))
    .where(and(...conditions))
    .orderBy(desc(reviews.createdAt))
    .limit(100);

  const replyRows = rows.length
    ? await db
        .select({
          reviewId: reviewReplies.reviewId,
          body: reviewReplies.body,
        })
        .from(reviewReplies)
        .where(
          inArray(
            reviewReplies.reviewId,
            rows.map((r) => r.id),
          ),
        )
    : [];
  const replyMap = new Map(replyRows.map((r) => [r.reviewId, r.body]));

  // Aggregate (over all published reviews for this provider, ignoring filter).
  const [agg] = await db
    .select({
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      n: sql<number>`count(*)::int`,
      pos: sql<number>`coalesce(count(*) filter (where ${reviews.rating} >= 4), 0)::int`,
    })
    .from(reviews)
    .where(
      and(eq(reviews.providerId, profile.id), eq(reviews.status, "published")),
    );
  const avg = Number(agg?.avg ?? 0);
  const n = Number(agg?.n ?? 0);
  const pct = n > 0 ? Math.round((Number(agg?.pos ?? 0) / n) * 100) : 0;

  const filters = [0, 5, 4, 3, 2, 1];

  const initialsOf = (name: string | null, fallback: string) => {
    const src = (name || fallback).trim();
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return (parts[0][0] + parts[1][0]).toUpperCase();
    return (src.slice(0, 2) || "?").toUpperCase();
  };

  return (
    <>
      <Header country={country} signedIn={true} initials={me.initials} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("reviewsTitle")}</h1>

        <section className="mt-4 grid grid-cols-3 gap-3">
          <Stat label={t("reviewsAvg", { avg: avg.toFixed(1) })} big>
            <Star
              size={18}
              className="fill-[var(--brand-accent)] text-[var(--brand-accent)]"
              aria-hidden
            />
          </Stat>
          <Stat label={t("reviewsCount", { n })} />
          <Stat label={t("reviewsRate", { pct })} />
        </section>

        <section className="mt-5 rounded-lg border border-border bg-bg-surface p-4">
          <ul className="flex flex-col gap-2.5">
            {DIM_KEYS.map((k) => (
              <li
                key={k}
                className="grid grid-cols-[100px_1fr_44px] items-center gap-3"
              >
                <span className="text-[14px] font-semibold">{t(k)}</span>
                <span className="h-2 rounded-full bg-bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${(avg / 5) * 100}%` }}
                    aria-hidden
                  />
                </span>
                <span className="text-right text-[13px] font-bold tabular-nums">
                  {avg.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-text-tertiary">
            {t("reviewsAvg", { avg: avg.toFixed(1) })} — per-dimension breakdown
            ships when category-tagged reviews land.
          </p>
        </section>

        <nav
          role="tablist"
          className="mt-5 flex gap-2 overflow-x-auto scrollbar-hide"
        >
          {filters.map((f) => {
            const on = f === filter;
            return (
              <Link
                key={f}
                href={f === 0 ? `?` : `?stars=${f}`}
                role="tab"
                aria-selected={on}
                className={
                  "inline-flex h-10 items-center gap-1 rounded-pill border-[1.5px] px-4 text-[14px] font-semibold tabular-nums " +
                  (on
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border-strong bg-bg-surface text-text-primary")
                }
              >
                {f === 0 ? t("reviewsAll") : `${f}★`}
              </Link>
            );
          })}
        </nav>

        {rows.length === 0 ? (
          <p className="mt-6 rounded-lg border border-border bg-bg-surface px-5 py-8 text-center text-[14px] text-text-tertiary">
            —
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {rows.map((r) => {
              const reply = replyMap.get(r.id) ?? null;
              const dispName =
                r.customerName ||
                r.customerEmail?.split("@")[0] ||
                "—";
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-bg-surface p-4"
                >
                  <div className="flex items-start gap-3">
                    <ProviderAvatar
                      size={44}
                      hue={1}
                      initials={initialsOf(r.customerName, r.customerEmail ?? "?")}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <p className="text-[15px] font-bold">{dispName}</p>
                        <p className="text-[12px] text-text-tertiary tabular-nums">
                          {r.createdAt.toLocaleDateString(
                            locale === "en" ? "en-AU" : locale,
                            { month: "short", day: "numeric" },
                          )}
                        </p>
                      </div>
                      <div
                        className="mt-1 flex gap-0.5"
                        aria-label={t("reviewStars", { n: r.rating })}
                      >
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={14}
                            className={
                              i <= r.rating
                                ? "fill-[var(--brand-accent)] text-[var(--brand-accent)]"
                                : "text-text-tertiary"
                            }
                            aria-hidden
                          />
                        ))}
                      </div>
                      {r.comment && (
                        <p className="mt-2 text-[14px] text-text-primary">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  </div>

                  {reply ? (
                    <div className="mt-3 rounded-md bg-bg-surface-2 p-3">
                      <p className="text-[12px] font-bold text-text-secondary">
                        {t("reviewsReplied")}
                      </p>
                      <p className="mt-0.5 text-[13px] text-text-primary">
                        {reply}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <ReplyReviewModal
                        action={replyAction}
                        locale={locale}
                        reviewId={r.id}
                        strings={{
                          triggerLabel: t("reviewsReply"),
                          title: t("reviewsReply"),
                          cancel: tCommon("cancel"),
                          submit: t("reviewsReply"),
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

function Stat({
  label,
  big = false,
  children,
}: {
  label: string;
  big?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-3 text-center">
      <p
        className={
          "flex items-center justify-center gap-1 tabular-nums font-extrabold " +
          (big ? "text-[20px]" : "text-[16px]")
        }
      >
        {children}
        {label}
      </p>
    </div>
  );
}
