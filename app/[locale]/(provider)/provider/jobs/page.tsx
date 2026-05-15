import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import {
  eq,
  and,
  inArray,
  gte,
  lt,
  asc,
  desc,
  type SQL,
} from "drizzle-orm";
import { ChevronRight, MapPin, ListChecks } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { getCountry } from "@/components/domain/countryCookie";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { EmptyState } from "@/components/domain/PageStates";
import { priceCountry } from "@/components/domain/pricing";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema/bookings";
import { providerProfiles } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { addresses } from "@/lib/db/schema/customer-data";
import { services } from "@/lib/db/schema/services";
import { getCurrentUser } from "@/lib/auth/server";
import { getProviderActiveState } from "@/lib/provider/requireActiveProvider";

type Tab = "today" | "week" | "history";

type DbStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed"
  | "released";

const ACTIVE_STATUSES: DbStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
];
const PAST_STATUSES: DbStatus[] = [
  "completed",
  "cancelled",
  "released",
  "disputed",
];

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

export default async function ProviderJobsPage({
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

  const activeState = await getProviderActiveState(me.id);
  const isActive = activeState?.active ?? false;
  // A not-yet-active provider can still see jobs already in flight, but no
  // new `pending` dispatches.
  const activeStatuses = isActive
    ? ACTIVE_STATUSES
    : ACTIVE_STATUSES.filter((s) => s !== "pending");

  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: Tab =
    rawTab === "week" || rawTab === "history" ? rawTab : "today";

  // Build filter for tab
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const endOfWeek = new Date(startOfDay);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  let where: SQL;
  let order: SQL;
  if (tab === "today") {
    where = and(
      eq(bookings.providerId, profile.id),
      inArray(bookings.status, activeStatuses),
      gte(bookings.scheduledAt, startOfDay),
      lt(bookings.scheduledAt, endOfDay),
    )!;
    order = asc(bookings.scheduledAt);
  } else if (tab === "week") {
    where = and(
      eq(bookings.providerId, profile.id),
      inArray(bookings.status, activeStatuses),
      gte(bookings.scheduledAt, endOfDay),
      lt(bookings.scheduledAt, endOfWeek),
    )!;
    order = asc(bookings.scheduledAt);
  } else {
    where = and(
      eq(bookings.providerId, profile.id),
      inArray(bookings.status, PAST_STATUSES),
    )!;
    order = desc(bookings.scheduledAt);
  }

  const jobs = await db
    .select({
      id: bookings.id,
      scheduledAt: bookings.scheduledAt,
      status: bookings.status,
      totalPrice: bookings.totalPrice,
      customerName: users.name,
      customerEmail: users.email,
      addressLine1: addresses.line1,
      addressCity: addresses.city,
      serviceCategory: services.categoryCode,
    })
    .from(bookings)
    .leftJoin(users, eq(users.id, bookings.customerId))
    .leftJoin(addresses, eq(addresses.id, bookings.addressId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(where)
    .orderBy(order)
    .limit(50);

  const tabs: { key: Tab; label: string }[] = [
    { key: "today", label: t("jobsTabToday") },
    { key: "week", label: t("jobsTabWeek") },
    { key: "history", label: t("jobsTabHistory") },
  ];
  const emptyKey =
    tab === "today"
      ? "jobsEmptyToday"
      : tab === "week"
        ? "jobsEmptyWeek"
        : "jobsEmptyHistory";

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
        <h1 className="text-h2">{t("navJobs")}</h1>

        {!isActive && (
          <div
            role="status"
            className="mt-3 rounded-md border-[1.5px] border-warning bg-warning-soft px-3.5 py-3 text-[13px] font-semibold text-warning"
          >
            {t("accountInReview")}
          </div>
        )}

        <nav
          role="tablist"
          aria-label={t("navJobs")}
          className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide"
        >
          {tabs.map((tb) => {
            const on = tb.key === tab;
            return (
              <Link
                key={tb.key}
                href={`?tab=${tb.key}`}
                role="tab"
                aria-selected={on}
                className={
                  "inline-flex h-10 items-center rounded-pill border-[1.5px] px-4 text-[14px] font-semibold " +
                  (on
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border-strong bg-bg-surface text-text-primary")
                }
              >
                {tb.label}
              </Link>
            );
          })}
        </nav>

        {jobs.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              illustration={ListChecks as never}
              title={t(emptyKey as Parameters<typeof t>[0])}
              hint={t("availabilityHint")}
            />
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {jobs.map((j) => {
              const dispName =
                j.customerName || (j.customerEmail?.split("@")[0] ?? "—");
              const initials = initialsOf(
                j.customerName,
                j.customerEmail ?? "?",
              );
              const dateLabel = j.scheduledAt.toLocaleDateString(
                locale === "en" ? "en-AU" : locale,
                { weekday: "short", month: "short", day: "numeric" },
              );
              const timeLabel = j.scheduledAt.toLocaleTimeString(
                locale === "en" ? "en-AU" : locale,
                { hour: "2-digit", minute: "2-digit" },
              );
              const serviceLabel = j.serviceCategory
                ? tCategories(
                    j.serviceCategory as Parameters<typeof tCategories>[0],
                  )
                : "—";
              const addressStr =
                [j.addressLine1, j.addressCity].filter(Boolean).join(", ") || "—";
              return (
                <li key={j.id}>
                  <Link
                    href={`/provider/jobs/${j.id}`}
                    className="flex items-start gap-3 rounded-lg border border-border bg-bg-surface p-4"
                  >
                    <ProviderAvatar size={48} hue={2} initials={initials} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary tabular-nums">
                        {dateLabel} · {timeLabel}
                      </p>
                      <p className="mt-0.5 text-[16px] font-bold">{dispName}</p>
                      <p className="mt-0.5 text-[14px] text-text-secondary">
                        {serviceLabel}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[13px] text-text-tertiary">
                        <MapPin size={14} aria-hidden />
                        <span className="truncate">{addressStr}</span>
                      </p>
                      <p className="mt-1 text-[14px] font-semibold tabular-nums">
                        {priceCountry(country, Number(j.totalPrice))}
                        <span className="ml-2 font-normal text-text-tertiary">
                          · {j.status}
                        </span>
                      </p>
                    </div>
                    <ChevronRight
                      size={20}
                      className="mt-2 shrink-0 text-text-tertiary"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
