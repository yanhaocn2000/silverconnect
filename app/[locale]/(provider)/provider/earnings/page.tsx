import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq, and, gte, inArray } from "drizzle-orm";
import { Download } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { getCountry } from "@/components/domain/countryCookie";
import { priceCountry } from "@/components/domain/pricing";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema/bookings";
import { providerProfiles } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { services } from "@/lib/db/schema/services";
import { wallets } from "@/lib/db/schema/payments";
import { getCurrentUser } from "@/lib/auth/server";

type Range = "week" | "month" | "all";

const PLATFORM_FEE_PCT = 0.18; // see admin_settings.platform.fee_rate.<country> in production

export default async function ProviderEarningsPage({
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
  const tCategories = await getTranslations("categories");

  const [profile] = await db
    .select({ id: providerProfiles.id })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, me.id))
    .limit(1);
  if (!profile) nextRedirect(`/${locale}/provider/register`);

  const rawRange = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const range: Range =
    rawRange === "month" || rawRange === "all" ? rawRange : "week";

  const since = new Date();
  if (range === "week") since.setDate(since.getDate() - 7);
  else if (range === "month") since.setMonth(since.getMonth() - 1);
  else since.setFullYear(since.getFullYear() - 5); // effectively "all"

  // Pull bookings for this provider in range. We count completed +
  // released as gross earnings; in_progress contributes to held until
  // the customer marks complete.
  const myBookings = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      totalPrice: bookings.totalPrice,
      currency: bookings.currency,
      scheduledAt: bookings.scheduledAt,
      completedAt: bookings.completedAt,
      customerName: users.name,
      customerEmail: users.email,
      serviceCategory: services.categoryCode,
    })
    .from(bookings)
    .leftJoin(users, eq(users.id, bookings.customerId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(
      and(
        eq(bookings.providerId, profile.id),
        inArray(bookings.status, [
          "in_progress",
          "completed",
          "released",
        ] as const),
        gte(bookings.scheduledAt, since),
      ),
    )
    .orderBy(bookings.scheduledAt);

  const gross = myBookings.reduce((s, b) => s + Number(b.totalPrice), 0);
  const fee = +(gross * PLATFORM_FEE_PCT).toFixed(2);
  const net = +(gross - fee).toFixed(2);

  // Held / Paid live in wallets — payouts move money from pending to
  // available. Until Stripe payouts are wired, both stay 0 unless an
  // admin manually flipped them. The seeded Wave 2 smoke set Helen's
  // wallet so the dashboard isn't blank.
  const [wallet] = await db
    .select({
      held: wallets.balancePending,
      paid: wallets.balanceAvailable,
      currency: wallets.currency,
    })
    .from(wallets)
    .where(eq(wallets.providerId, profile.id))
    .limit(1);
  const held = wallet ? Number(wallet.held) : 0;
  const paid = wallet ? Number(wallet.paid) : 0;

  // 7-day trend (always last 7 days regardless of selected range, so
  // the chart stays readable).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
  const dayTotals = days.map((d) => {
    const k = d.toISOString().slice(0, 10);
    return myBookings
      .filter((b) => b.scheduledAt.toISOString().slice(0, 10) === k)
      .reduce((s, b) => s + Number(b.totalPrice), 0);
  });
  const peak = Math.max(1, ...dayTotals);

  const ranges: { key: Range; label: string }[] = [
    { key: "week", label: t("earnRangeWeek") },
    { key: "month", label: t("earnRangeMonth") },
    { key: "all", label: t("earnRangeCustom") },
  ];

  return (
    <>
      <Header
        country={country}
        signedIn={true}
        initials={me.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("earningsTitle")}</h1>

        <nav
          role="tablist"
          className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide"
        >
          {ranges.map((r) => {
            const on = r.key === range;
            return (
              <Link
                key={r.key}
                href={`?range=${r.key}`}
                role="tab"
                aria-selected={on}
                className={
                  "inline-flex h-10 items-center rounded-pill border-[1.5px] px-4 text-[14px] font-semibold " +
                  (on
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border-strong bg-bg-base text-text-primary")
                }
              >
                {r.label}
              </Link>
            );
          })}
        </nav>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <Card label={t("earnGross")} value={priceCountry(country, gross)} />
          <Card label={t("earnNet")} value={priceCountry(country, net)} accent />
          <Card label={t("earnHeld")} value={priceCountry(country, held)} />
          <Card label={t("earnPaid")} value={priceCountry(country, paid)} />
        </section>

        <section className="mt-5 rounded-lg border border-border bg-bg-base p-4">
          <p className="text-[14px] font-bold">{t("earnFee")}</p>
          <p className="mt-1 text-[15px] tabular-nums">
            {priceCountry(country, fee)}{" "}
            <span className="text-text-tertiary">
              ({Math.round(PLATFORM_FEE_PCT * 100)}%)
            </span>
          </p>
        </section>

        <section className="mt-5 rounded-lg border border-border bg-bg-base p-4">
          <p className="text-[14px] font-bold">{t("earnRangeWeek")}</p>
          <div className="mt-4 grid h-24 grid-cols-7 items-end gap-2">
            {dayTotals.map((v, i) => {
              const h = Math.max(4, Math.round((v / peak) * 96));
              return (
                <div
                  key={i}
                  role="img"
                  className={
                    "rounded-t-sm " + (v > 0 ? "bg-brand" : "bg-bg-surface-2")
                  }
                  style={{ height: `${h}px` }}
                  aria-label={`${days[i].toLocaleDateString(locale === "en" ? "en-AU" : locale, { month: "short", day: "numeric" })} ${priceCountry(country, v)}`}
                />
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2 text-center text-[11px] text-text-tertiary tabular-nums">
            {days.map((d, i) => (
              <div key={i}>{d.getDate()}</div>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <ul className="overflow-hidden rounded-lg border border-border bg-bg-base">
            {myBookings.length === 0 ? (
              <li className="p-5 text-[14px] text-text-tertiary">
                {t("payoutsEmpty")}
              </li>
            ) : (
              myBookings.map((b, i) => (
                <li
                  key={b.id}
                  className={
                    "flex items-center gap-3 px-4 py-3.5 " +
                    (i > 0 ? "border-t border-border" : "")
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold">
                      {b.serviceCategory
                        ? tCategories(
                            b.serviceCategory as Parameters<
                              typeof tCategories
                            >[0],
                          )
                        : "—"}
                    </p>
                    <p className="mt-0.5 text-[12px] text-text-tertiary tabular-nums">
                      {b.scheduledAt.toLocaleDateString(
                        locale === "en" ? "en-AU" : locale,
                        { month: "short", day: "numeric" },
                      )}
                      {" · "}
                      {b.customerName ||
                        (b.customerEmail?.split("@")[0] ?? "—")}
                      {" · "}
                      <span className="uppercase">{b.status}</span>
                    </p>
                  </div>
                  <p className="tabular-nums text-[15px] font-semibold">
                    {priceCountry(country, Number(b.totalPrice))}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <button
          type="button"
          disabled
          title="CSV export ships when payouts are wired"
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-border-strong bg-bg-base text-[15px] font-semibold text-text-primary opacity-60"
        >
          <Download size={18} aria-hidden />
          {t("earnExport")}
        </button>
      </main>
    </>
  );
}

function Card({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border bg-bg-base p-4 " +
        (accent ? "border-brand bg-brand-soft" : "border-border")
      }
    >
      <p className="text-[13px] text-text-tertiary">{label}</p>
      <p
        className={
          "mt-0.5 text-[22px] font-extrabold tabular-nums " +
          (accent ? "text-brand" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}
