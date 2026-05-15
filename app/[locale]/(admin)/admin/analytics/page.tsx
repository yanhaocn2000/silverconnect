import { setRequestLocale, getTranslations } from "next-intl/server";
import { eq, and, gte, sql } from "drizzle-orm";
import { Link, redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { getAdmin } from "@/components/domain/adminCookie";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema/bookings";
import { users } from "@/lib/db/schema/users";
import { reviews } from "@/lib/db/schema/reviews";
import { disputes } from "@/lib/db/schema/disputes";
import { payments } from "@/lib/db/schema/payments";
import { aiConversations } from "@/lib/db/schema/ai";

type Range = "day" | "week" | "month" | "quarter" | "year";

const COUNTRY_COLOR: Record<string, string> = {
  AU: "bg-brand",
  US: "bg-success",
  CA: "bg-warning",
};

const COUNTRIES = ["AU", "US", "CA"] as const;

export default async function AdminAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const admin = await getAdmin();
  if (!admin.signedIn) redirect({ href: "/admin/login", locale });
  const t = await getTranslations("admin");

  const rawRange = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const range: Range =
    rawRange === "day" ||
    rawRange === "month" ||
    rawRange === "quarter" ||
    rawRange === "year"
      ? rawRange
      : "week";

  const since = new Date();
  if (range === "day") since.setDate(since.getDate() - 1);
  else if (range === "week") since.setDate(since.getDate() - 7);
  else if (range === "month") since.setMonth(since.getMonth() - 1);
  else if (range === "quarter") since.setMonth(since.getMonth() - 3);
  else since.setFullYear(since.getFullYear() - 1);

  // Bookings in range with customer country.
  const bookingRows = await db
    .select({
      country: users.country,
      scheduledAt: bookings.scheduledAt,
      customerId: bookings.customerId,
      status: bookings.status,
    })
    .from(bookings)
    .leftJoin(users, eq(users.id, bookings.customerId))
    .where(gte(bookings.scheduledAt, since));

  // Last 7 days bucket for the chart (always 7 bars regardless of range).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
  const dayKeys = days.map((d) => d.toISOString().slice(0, 10));

  // For chart: count by country × day (across last 7 days specifically,
  // overlay the range window for KPIs).
  const chartSince = new Date(today);
  chartSince.setDate(today.getDate() - 6);
  const chartRows = bookingRows.filter(
    (b) => b.scheduledAt >= chartSince,
  );
  const ordersByCountry: { country: string; values: number[] }[] =
    COUNTRIES.map((c) => ({
      country: c,
      values: dayKeys.map(
        (k) =>
          chartRows.filter(
            (b) =>
              b.country === c &&
              b.scheduledAt.toISOString().slice(0, 10) === k,
          ).length,
      ),
    }));
  const peak = Math.max(1, ...ordersByCountry.flatMap((c) => c.values));

  // Reorder rate: customers with >1 booking in range / customers with ≥1.
  const customerCounts = new Map<string, number>();
  for (const b of bookingRows) {
    customerCounts.set(b.customerId, (customerCounts.get(b.customerId) ?? 0) + 1);
  }
  const totalCustomers = customerCounts.size;
  const reorderingCustomers = Array.from(customerCounts.values()).filter(
    (n) => n > 1,
  ).length;
  const reorderRate = totalCustomers ? reorderingCustomers / totalCustomers : 0;

  // Avg rating (published reviews in range).
  const [ratingAgg] = await db
    .select({
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      n: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(
      and(eq(reviews.status, "published"), gte(reviews.createdAt, since)),
    );

  // Dispute rate: disputes / bookings (in range).
  const [{ n: disputeCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(disputes)
    .where(gte(disputes.createdAt, since));
  const totalBookings = bookingRows.length;
  const disputeRate = totalBookings ? disputeCount / totalBookings : 0;

  // AI resolution: closed conversations without emergency / all closed.
  const [aiAgg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      resolved: sql<number>`count(*) filter (where ${aiConversations.closedAt} is not null and ${aiConversations.emergencyTriggeredAt} is null)::int`,
    })
    .from(aiConversations)
    .where(gte(aiConversations.createdAt, since));
  const aiResolutionRate = aiAgg.total ? aiAgg.resolved / aiAgg.total : 0;

  // Payment success: captured / (captured + failed).
  const [payAgg] = await db
    .select({
      captured: sql<number>`count(*) filter (where ${payments.status} = 'captured')::int`,
      failed: sql<number>`count(*) filter (where ${payments.status} = 'failed')::int`,
    })
    .from(payments)
    .where(gte(payments.createdAt, since));
  const payTotal = payAgg.captured + payAgg.failed;
  const paymentSuccess = payTotal ? payAgg.captured / payTotal : 1;

  const ranges: { key: Range; label: string }[] = [
    { key: "day", label: t("rangeDay") },
    { key: "week", label: t("rangeWeek") },
    { key: "month", label: t("rangeMonth") },
    { key: "quarter", label: t("rangeQuarter") },
    { key: "year", label: t("rangeYear") },
  ];

  const kpiBlocks = [
    { label: t("metricReorder"), value: `${Math.round(reorderRate * 100)}%` },
    {
      label: t("metricRating"),
      value: aiAgg && Number(ratingAgg?.n ?? 0) > 0
        ? Number(ratingAgg.avg).toFixed(1)
        : "—",
    },
    {
      label: t("metricDispute"),
      value: `${(disputeRate * 100).toFixed(1)}%`,
    },
    { label: t("metricAi"), value: `${Math.round(aiResolutionRate * 100)}%` },
    {
      label: t("metricPayment"),
      value: `${(paymentSuccess * 100).toFixed(1)}%`,
    },
  ];

  const dayLabels = days.map((d) =>
    d.toLocaleDateString(locale === "en" ? "en-AU" : locale, {
      weekday: "short",
    }),
  );

  return (
    <AdminShell email={admin.email ?? ""}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h2">{t("analyticsTitle")}</h1>
      </div>

      <nav role="tablist" className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {ranges.map((r) => {
          const on = r.key === range;
          return (
            <Link
              key={r.key}
              href={`?range=${r.key}`}
              role="tab"
              aria-selected={on}
              className={
                "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 text-[13px] font-semibold " +
                (on
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border-strong bg-bg-surface text-text-primary")
              }
            >
              {r.label}
            </Link>
          );
        })}
      </nav>

      <p className="mt-3 text-[12px] text-text-tertiary tabular-nums">
        {totalBookings} bookings · {totalCustomers} customers in range
      </p>

      <section className="mt-4 rounded-lg border border-border bg-bg-surface p-5">
        <p className="text-[14px] font-bold">{t("metricOrders")}</p>
        <p className="mt-0.5 text-[12px] text-text-tertiary">
          Last 7 days, by country
        </p>
        <div className="mt-4 grid h-40 grid-cols-7 items-end gap-3">
          {dayLabels.map((_, i) => (
            <div key={i} className="flex h-full flex-col-reverse gap-1">
              {ordersByCountry.map((c) => {
                const v = c.values[i];
                const h = Math.round((v / peak) * 140);
                return (
                  <div
                    key={c.country}
                    role="img"
                    className={`rounded-t-sm ${COUNTRY_COLOR[c.country]} ${v === 0 ? "opacity-20" : ""}`}
                    style={{ height: `${Math.max(2, h / ordersByCountry.length)}px` }}
                    aria-label={`${c.country} ${dayLabels[i]} ${v}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-7 gap-3 text-center text-[11px] text-text-tertiary">
          {dayLabels.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
        <ul className="mt-4 flex flex-wrap gap-3 text-[12px]">
          {ordersByCountry.map((c) => (
            <li key={c.country} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 rounded-full ${COUNTRY_COLOR[c.country]}`}
              />
              <span>
                {t(
                  `country${c.country}` as
                    | "countryAU"
                    | "countryUS"
                    | "countryCA",
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpiBlocks.map((k) => (
          <div
            key={k.label}
            className="rounded-lg border border-border bg-bg-surface p-4"
          >
            <p className="text-[12px] text-text-tertiary">{k.label}</p>
            <p className="mt-1 text-[22px] font-extrabold tabular-nums">
              {k.value}
            </p>
          </div>
        ))}
      </section>
    </AdminShell>
  );
}
