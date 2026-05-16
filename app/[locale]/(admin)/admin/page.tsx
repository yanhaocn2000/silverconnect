import { setRequestLocale, getTranslations } from "next-intl/server";
import { Scale, ShieldAlert, Users, Flag, RotateCcw } from "lucide-react";
import { and, eq, gte, sql, desc, isNull } from "drizzle-orm";
import { Link, redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { getAdmin } from "@/components/domain/adminCookie";
import { db } from "@/lib/db";
import { bookings, bookingChanges } from "@/lib/db/schema/bookings";
import { disputes } from "@/lib/db/schema/disputes";
import { providerProfiles } from "@/lib/db/schema/providers";
import { safetyEvents } from "@/lib/db/schema/safety";
import { reviewReports } from "@/lib/db/schema/reviews";
import { refunds } from "@/lib/db/schema/payments";
import { services } from "@/lib/db/schema/services";

/** Platform commission rate — platform keeps 20% of GMV. */
const PLATFORM_FEE_RATE = 0.2;

function deltaPct(cur: number, prev: number): number {
  if (prev > 0) return ((cur - prev) / prev) * 100;
  return cur > 0 ? 100 : 0;
}

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await getAdmin();
  if (!admin.signedIn) redirect({ href: "/admin/login", locale });
  const t = await getTranslations("admin");
  const tCat = await getTranslations("categories");
  const intlLocale = locale === "en" ? "en-AU" : locale;

  const now = new Date();
  const d7 = new Date(now);
  d7.setDate(d7.getDate() - 7);
  const d14 = new Date(now);
  d14.setDate(d14.getDate() - 14);
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  // Bare Dates inside a drizzle `sql` template aren't column-typed, so the
  // driver can't encode them — pass ISO strings and cast in SQL instead.
  const d7s = d7.toISOString();
  const d14s = d14.toISOString();

  // --- stat cards: current vs prior 7-day window ---
  const [cust] = await db
    .select({
      cur: sql<number>`count(distinct ${bookings.customerId}) filter (where ${bookings.createdAt} >= ${d7s}::timestamptz)::int`,
      prev: sql<number>`count(distinct ${bookings.customerId}) filter (where ${bookings.createdAt} >= ${d14s}::timestamptz and ${bookings.createdAt} < ${d7s}::timestamptz)::int`,
    })
    .from(bookings)
    .where(gte(bookings.createdAt, d14));

  const [gmv] = await db
    .select({
      cur: sql<number>`coalesce(sum(${bookings.totalPrice}::numeric) filter (where ${bookings.createdAt} >= ${d7s}::timestamptz), 0)::float`,
      prev: sql<number>`coalesce(sum(${bookings.totalPrice}::numeric) filter (where ${bookings.createdAt} >= ${d14s}::timestamptz and ${bookings.createdAt} < ${d7s}::timestamptz), 0)::float`,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.createdAt, d14),
        sql`${bookings.status} in ('completed','released')`,
      ),
    );

  const [prov] = await db
    .select({
      approved: sql<number>`count(*) filter (where ${providerProfiles.onboardingStatus} = 'approved')::int`,
      pending: sql<number>`count(*) filter (where ${providerProfiles.onboardingStatus} = 'pending')::int`,
      newCur: sql<number>`count(*) filter (where ${providerProfiles.onboardingStatus} = 'approved' and ${providerProfiles.createdAt} >= ${d7s}::timestamptz)::int`,
      newPrev: sql<number>`count(*) filter (where ${providerProfiles.onboardingStatus} = 'approved' and ${providerProfiles.createdAt} >= ${d14s}::timestamptz and ${providerProfiles.createdAt} < ${d7s}::timestamptz)::int`,
    })
    .from(providerProfiles);

  const customersCur = cust?.cur ?? 0;
  const gmvCur = Number(gmv?.cur ?? 0);
  const gmvPrev = Number(gmv?.prev ?? 0);
  const feeCur = gmvCur * PLATFORM_FEE_RATE;
  const approvedProviders = prov?.approved ?? 0;
  const pendingProviders = prov?.pending ?? 0;

  const money = (n: number) => `$${Math.round(n).toLocaleString(intlLocale)}`;

  const stats = [
    {
      label: t("statCustomers"),
      value: customersCur.toLocaleString(intlLocale),
      hint: t("statCustomersHint"),
      delta: deltaPct(customersCur, cust?.prev ?? 0),
    },
    {
      label: t("statProviders"),
      value: approvedProviders.toLocaleString(intlLocale),
      hint: t("statProvidersHint", { pending: pendingProviders }),
      delta: deltaPct(prov?.newCur ?? 0, prov?.newPrev ?? 0),
    },
    {
      label: t("statGmv"),
      value: money(gmvCur),
      hint: t("statGmvHint"),
      delta: deltaPct(gmvCur, gmvPrev),
    },
    {
      label: t("statFee"),
      value: money(feeCur),
      hint: t("statFeeHint", { pct: Math.round(PLATFORM_FEE_RATE * 100) }),
      delta: deltaPct(gmvCur, gmvPrev),
    },
  ];

  // --- 24h order-volume chart: 8 buckets of 3 hours ---
  const hourRows = await db
    .select({
      h: sql<number>`extract(hour from ${bookings.createdAt})::int`,
      n: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(gte(bookings.createdAt, startToday))
    .groupBy(sql`extract(hour from ${bookings.createdAt})`);
  const buckets = Array.from({ length: 8 }, () => 0);
  for (const r of hourRows) buckets[Math.floor(r.h / 3)] += r.n;
  const bucketMax = Math.max(1, ...buckets);

  // --- attention list ---
  const [[od], [os], [rr], [pr]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(disputes)
      .where(eq(disputes.status, "open")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(safetyEvents)
      .where(eq(safetyEvents.status, "open")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(reviewReports)
      .where(isNull(reviewReports.resolvedAt)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(refunds)
      .where(eq(refunds.status, "pending")),
  ]);
  const attention = [
    {
      Icon: Scale,
      label: t("attnDisputes"),
      n: od?.n ?? 0,
      href: "/admin/disputes?status=open",
    },
    {
      Icon: ShieldAlert,
      label: t("attnSafety"),
      n: os?.n ?? 0,
      href: "/admin/safety",
    },
    {
      Icon: Users,
      label: t("attnProviders"),
      n: pendingProviders,
      href: "/admin/providers",
    },
    {
      Icon: Flag,
      label: t("attnReports"),
      n: rr?.n ?? 0,
      href: "/admin/reports",
    },
    {
      Icon: RotateCcw,
      label: t("attnRefunds"),
      n: pr?.n ?? 0,
      href: "/admin/refunds",
    },
  ];

  // --- top categories this week ---
  const catRows = await db
    .select({
      cat: services.categoryCode,
      n: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .where(gte(bookings.createdAt, d7))
    .groupBy(services.categoryCode)
    .orderBy(desc(sql`count(*)`))
    .limit(5);
  const catMax = Math.max(1, ...catRows.map((c) => c.n));

  // --- recent events ---
  const events = await db
    .select({
      id: bookingChanges.id,
      fromStatus: bookingChanges.fromStatus,
      toStatus: bookingChanges.toStatus,
      note: bookingChanges.note,
      createdAt: bookingChanges.createdAt,
    })
    .from(bookingChanges)
    .orderBy(desc(bookingChanges.createdAt))
    .limit(6);

  return (
    <AdminShell email={admin.email ?? ""}>
      <h1 className="text-h2">{t("overviewTitle")}</h1>
      <p className="mt-1 text-[13px] text-text-tertiary">
        {now.toLocaleDateString(intlLocale, {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}{" "}
        · {t("overviewLive")}
      </p>

      {/* Stat cards */}
      <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const up = s.delta >= 0;
          return (
            <div
              key={s.label}
              className="rounded-lg border border-border bg-bg-surface p-4"
            >
              <p className="text-[13px] text-text-tertiary">{s.label}</p>
              <p className="mt-1 text-[26px] font-extrabold tabular-nums">
                {s.value}
              </p>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-[12px] text-text-tertiary">
                  {s.hint}
                </span>
                <span
                  className={
                    "shrink-0 text-[12px] font-bold tabular-nums " +
                    (up ? "text-success" : "text-danger")
                  }
                >
                  {up ? "+" : ""}
                  {s.delta.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Chart + attention */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-lg border border-border bg-bg-surface p-5">
          <h2 className="text-[16px] font-bold">{t("chartTitle")}</h2>
          <div className="mt-5 flex h-44 items-end gap-2">
            {buckets.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-sm bg-brand"
                    style={{
                      height: `${Math.max(4, (n / bucketMax) * 100)}%`,
                    }}
                    title={`${n}`}
                    aria-hidden
                  />
                </div>
                <span className="text-[11px] tabular-nums text-text-tertiary">
                  {String(i * 3).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-surface p-5">
          <h2 className="text-[16px] font-bold">{t("attentionTitle")}</h2>
          <ul className="mt-3 flex flex-col">
            {attention.map((a) => (
              <li key={a.label}>
                <Link
                  href={a.href}
                  className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
                >
                  <span
                    aria-hidden
                    className={
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md " +
                      (a.n > 0
                        ? "bg-warning-soft text-warning"
                        : "bg-bg-surface-2 text-text-tertiary")
                    }
                  >
                    <a.Icon size={16} />
                  </span>
                  <span className="flex-1 text-[14px]">{a.label}</span>
                  <span className="text-[16px] font-extrabold tabular-nums">
                    {a.n}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Top categories + recent events */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-surface p-5">
          <h2 className="text-[16px] font-bold">{t("topCategoriesTitle")}</h2>
          {catRows.length === 0 ? (
            <p className="mt-4 text-[14px] text-text-tertiary">
              {t("recentEventsEmpty")}
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {catRows.map((c) => (
                <li
                  key={c.cat}
                  className="grid grid-cols-[88px_1fr_40px] items-center gap-3"
                >
                  <span className="truncate text-[13px] font-semibold">
                    {tCat(c.cat as Parameters<typeof tCat>[0])}
                  </span>
                  <span className="h-2.5 rounded-full bg-bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${(c.n / catMax) * 100}%` }}
                      aria-hidden
                    />
                  </span>
                  <span className="text-right text-[13px] font-bold tabular-nums">
                    {c.n}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border bg-bg-surface p-5">
          <h2 className="text-[16px] font-bold">{t("recentEventsTitle")}</h2>
          {events.length === 0 ? (
            <p className="mt-4 text-[14px] text-text-tertiary">
              {t("recentEventsEmpty")}
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-text-primary">
                      {e.note ||
                        `${e.fromStatus ?? "—"} → ${e.toStatus ?? "—"}`}
                    </p>
                    <p className="text-[11px] tabular-nums text-text-tertiary">
                      {e.createdAt.toLocaleString(intlLocale, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
