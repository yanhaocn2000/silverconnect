import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound, redirect as nextRedirect } from "next/navigation";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { Star, ShieldCheck, MessageCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { ReportReviewModal } from "@/components/domain/ReportReviewModal";
import { CURRENCY_SYMBOL, TAX_ABBR } from "@/components/domain/country";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";
import { db } from "@/lib/db";
import {
  providerProfiles,
  providerCategories,
  providerBadges,
} from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { services, servicePrices } from "@/lib/db/schema/services";
import { reviews, reviewReports } from "@/lib/db/schema/reviews";
import { getCurrentUser } from "@/lib/auth/server";

type ReportReason = "spam" | "abusive" | "false" | "off_topic" | "other";
const VALID_REASONS: ReportReason[] = ["spam", "abusive", "false", "off_topic", "other"];

async function reportReviewAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const reviewId = String(formData.get("reviewId") ?? "");
  const reason = String(formData.get("reason") ?? "") as ReportReason;
  const details = String(formData.get("details") ?? "").trim() || null;
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!reviewId || !VALID_REASONS.includes(reason)) {
    nextRedirect(`/${locale}/providers?error=report_invalid`);
  }
  const [r] = await db
    .select({ id: reviews.id, providerId: reviews.providerId, status: reviews.status })
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1);
  if (!r) nextRedirect(`/${locale}/providers?error=report_missing`);

  await db.transaction(async (tx) => {
    await tx.insert(reviewReports).values({
      reviewId,
      reporterId: me.id,
      reason,
      details,
    });
    if (r.status === "published") {
      await tx
        .update(reviews)
        .set({ status: "reported", updatedAt: new Date() })
        .where(eq(reviews.id, reviewId));
    }
  });

  nextRedirect(`/${locale}/providers/${r.providerId}?reported=1`);
}

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

export default async function ProviderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  // Guard against malformed UUIDs — same fix as bookings/[id]
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  const t = await getTranslations("provider");
  const tCategories = await getTranslations("categories");
  const tCommon = await getTranslations("common");
  const country = await getCountry();
  const session = await getSession();
  const isZh = locale.startsWith("zh");
  const sym = CURRENCY_SYMBOL[country];
  const taxAbbr = TAX_ABBR[country];
  const reportedJustNow = sp.reported === "1";

  const reportReasonOptions = [
    { value: "spam", label: t("reportReasonSpam") },
    { value: "abusive", label: t("reportReasonAbusive") },
    { value: "false", label: t("reportReasonFalse") },
    { value: "off_topic", label: t("reportReasonOffTopic") },
    { value: "other", label: t("reportReasonOther") },
  ];

  const [profile] = await db
    .select({
      id: providerProfiles.id,
      bio: providerProfiles.bio,
      addressLine: providerProfiles.addressLine,
      onboardingStatus: providerProfiles.onboardingStatus,
      providerName: users.name,
      providerEmail: users.email,
    })
    .from(providerProfiles)
    .leftJoin(users, eq(users.id, providerProfiles.userId))
    .where(eq(providerProfiles.id, id))
    .limit(1);
  if (!profile) notFound();
  const offline = profile.onboardingStatus !== "approved";

  // Provider's offered service categories.
  const cats = await db
    .select({ category: providerCategories.category })
    .from(providerCategories)
    .where(eq(providerCategories.providerId, id));
  const categoryCodes = cats.map((c) => c.category);

  // Service variants in those categories with this country's price.
  const servicesOffered = categoryCodes.length
    ? await db
        .select({
          id: services.id,
          code: services.code,
          category: services.categoryCode,
          durationMin: services.durationMin,
          basePrice: servicePrices.basePrice,
          currency: servicePrices.currency,
        })
        .from(services)
        .leftJoin(
          servicePrices,
          and(
            eq(servicePrices.serviceId, services.id),
            eq(servicePrices.country, country),
          ),
        )
        .where(
          and(
            eq(services.enabled, true),
            inArray(services.categoryCode, categoryCodes),
          ),
        )
        .orderBy(services.categoryCode, services.sortOrder)
    : [];

  // Badges
  const badges = await db
    .select({ kind: providerBadges.kind })
    .from(providerBadges)
    .where(eq(providerBadges.providerId, id))
    .limit(10);

  // Review aggregate + recent.
  const [agg] = await db
    .select({
      n: sql<number>`count(*)::int`,
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
    })
    .from(reviews)
    .where(
      and(eq(reviews.providerId, id), eq(reviews.status, "published")),
    );
  const reviewCount = agg?.n ?? 0;
  const avgRating = agg?.avg ?? 0;

  // Histogram (1..5)
  const histRows = await db
    .select({
      rating: reviews.rating,
      n: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(
      and(eq(reviews.providerId, id), eq(reviews.status, "published")),
    )
    .groupBy(reviews.rating);
  const histMap = new Map<number, number>(
    histRows.map((r) => [r.rating, r.n]),
  );
  const histTotal = reviewCount || 1;

  const recent = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      customerId: reviews.customerId,
    })
    .from(reviews)
    .where(
      and(eq(reviews.providerId, id), eq(reviews.status, "published")),
    )
    .orderBy(desc(reviews.createdAt))
    .limit(5);
  const customerIds = Array.from(
    new Set(recent.map((r) => r.customerId)),
  );
  const customerRows = customerIds.length
    ? await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, customerIds))
    : [];
  const customerMap = new Map(
    customerRows.map((u) => [u.id, u.name || u.email.split("@")[0]]),
  );

  const dispName =
    profile.providerName ||
    (profile.providerEmail?.split("@")[0] ?? "Provider");
  const initials = initialsOf(profile.providerName, profile.providerEmail ?? "?");

  // Pick a default service (cheapest) for the CTA price hint.
  const defaultSvc = servicesOffered.find((s) => s.basePrice) ?? servicesOffered[0];
  const defaultBase = defaultSvc?.basePrice ? Number(defaultSvc.basePrice) : 0;
  const ctaPriceLabel = defaultBase
    ? `${sym}${defaultBase.toFixed(0)}`
    : sym;
  const ctaText = isZh
    ? `下一步 · 起 ${ctaPriceLabel} 含 ${taxAbbr}`
    : `Continue · from ${ctaPriceLabel} incl. ${taxAbbr}`;

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
        className="mx-auto w-full max-w-content overflow-auto bg-bg-surface px-5 pb-[120px] pt-5 sm:pb-12"
      >
        {offline && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-md border-[1.5px] border-warning bg-warning-soft p-3.5"
          >
            <p className="text-[#92590A] dark:text-[var(--brand-accent)] text-[14px] font-semibold">
              {t("currentlyOffline")}
            </p>
          </div>
        )}
        <header className="flex items-start gap-4">
          <ProviderAvatar size={100} hue={0} initials={initials} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-extrabold text-text-primary">
              {dispName}
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5">
              <Star
                size={18}
                className="text-[var(--brand-accent)]"
                aria-hidden
              />
              <span className="font-bold tabular-nums">
                {reviewCount > 0 ? avgRating.toFixed(1) : "—"}
              </span>
              <span className="text-[14px] text-text-tertiary">
                ({reviewCount} {t("reviews", { count: reviewCount }).replace(/^\d+\s*/, "")})
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {profile.onboardingStatus === "approved" && (
                <li>
                  <span className="inline-flex h-7 items-center gap-1 rounded-sm bg-success-soft px-2 text-[14px] font-semibold text-success">
                    <ShieldCheck size={14} aria-hidden /> {t("verified")}
                  </span>
                </li>
              )}
              {badges.slice(0, 3).map((b) => (
                <li key={b.kind}>
                  <span className="inline-flex h-7 items-center rounded-sm bg-brand-soft px-2 text-[14px] font-semibold text-brand">
                    {b.kind}
                  </span>
                </li>
              ))}
              {categoryCodes.slice(0, 3).map((c) => (
                <li key={c}>
                  <span className="inline-flex h-7 items-center rounded-sm bg-bg-surface-2 px-2 text-[13px] font-semibold text-text-secondary">
                    {tCategories(c as Parameters<typeof tCategories>[0])}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        {profile.bio && (
          <section className="mt-4 rounded-md border border-border bg-bg-surface p-3.5">
            <p className="text-[15px] leading-relaxed text-text-secondary">
              {profile.bio}
            </p>
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-2.5 text-[18px] font-bold">
            {t("servicesOffered")}
          </h2>
          {servicesOffered.length === 0 ? (
            <p className="rounded-md border border-border bg-bg-surface p-3.5 text-[14px] text-text-secondary">
              {isZh
                ? "该服务者暂无可提供的服务。"
                : "No service variants available right now."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {servicesOffered.map((s) => (
                <li key={s.id}>
                  <div className="flex min-h-16 items-center gap-3 rounded-md border-[1.5px] border-border bg-bg-surface p-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-bold">
                        {tCategories(
                          s.category as Parameters<typeof tCategories>[0],
                        )}{" "}
                        · {(s.durationMin / 60).toFixed(1)}h
                      </span>
                      <span className="mt-0.5 block text-[13px] text-text-tertiary">
                        {s.code}
                      </span>
                    </span>
                    <span className="shrink-0 text-[17px] font-bold text-brand tabular-nums">
                      {s.basePrice
                        ? `${sym}${Number(s.basePrice).toFixed(0)}`
                        : "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-2.5 text-[18px] font-bold">{t("reviewsTitle")}</h2>
          {reviewCount === 0 ? (
            <div className="rounded-md border border-border bg-bg-surface p-6 text-center">
              <p className="text-[16px] font-semibold text-text-secondary">
                {t("noReviews")}
              </p>
              <p className="mt-1 text-[13px] text-text-tertiary">
                {t("noReviewsHint")}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4 rounded-md border border-border bg-bg-surface p-3.5">
                <div className="text-[36px] font-extrabold tabular-nums text-text-primary">
                  {avgRating.toFixed(1)}
                </div>
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const pct = Math.round(((histMap.get(n) ?? 0) / histTotal) * 100);
                    return (
                      <div key={n} className="mb-0.5 flex items-center gap-1.5">
                        <span className="w-3 text-[12px] text-text-tertiary tabular-nums">
                          {n}
                        </span>
                        <Star
                          size={12}
                          className="text-[var(--brand-accent)]"
                          aria-hidden
                        />
                        <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-bg-surface-2">
                          <div
                            className="h-full bg-[var(--brand-accent)]"
                            style={{ width: pct + "%" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {reportedJustNow && (
                <div
                  role="status"
                  className="mt-3 rounded-md bg-success-soft px-3.5 py-2.5 text-[14px] font-semibold text-success"
                >
                  {t("reportSent")}
                </div>
              )}
              <ul className="mt-3 flex flex-col gap-3">
                {recent.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-border bg-bg-surface p-3.5"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="flex gap-1 text-[var(--brand-accent)]"
                        aria-label={`${r.rating} stars`}
                      >
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} size={14} aria-hidden />
                        ))}
                      </div>
                      {session.signedIn && (
                        <div className="ml-auto">
                          <ReportReviewModal
                            action={reportReviewAction}
                            locale={locale}
                            reviewId={r.id}
                            strings={{
                              triggerAriaLabel: t("reportTriggerLabel"),
                              title: t("reportTitle"),
                              hint: t("reportHint"),
                              reasonLegend: t("reportReason"),
                              reasonOptions: reportReasonOptions,
                              detailsLabel: t("reportDetails"),
                              cancel: tCommon("cancel"),
                              submit: t("reportSubmit"),
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {r.comment && (
                      <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
                        {r.comment}
                      </p>
                    )}
                    <p className="mt-1.5 text-[12px] text-text-tertiary">
                      — {customerMap.get(r.customerId) ?? "—"} ·{" "}
                      {r.createdAt.toLocaleDateString(
                        isZh ? "zh-CN" : "en-AU",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </main>

      <div className="sticky bottom-[84px] z-10 flex gap-2 border-t border-border bg-bg-surface p-3 sm:bottom-0">
        <button
          type="button"
          aria-label={t("messageLabel")}
          disabled
          className="inline-flex h-14 w-14 items-center justify-center rounded-md border-[1.5px] border-border-strong bg-bg-surface text-text-secondary opacity-60"
        >
          <MessageCircle size={22} aria-hidden />
        </button>
        {offline ? (
          <button
            type="button"
            disabled
            className="flex h-14 flex-1 items-center justify-center rounded-md bg-bg-surface-2 text-[17px] font-bold text-text-tertiary"
          >
            {t("currentlyOfflineCta")}
          </button>
        ) : (
          <Link
            href="/bookings/new?step=1"
            className="flex h-14 flex-1 items-center justify-center rounded-md bg-brand text-[17px] font-bold text-white hover:bg-brand-hover"
          >
            {ctaText}
          </Link>
        )}
      </div>
    </>
  );
}
