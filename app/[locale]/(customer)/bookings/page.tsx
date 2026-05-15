import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq, and, inArray, desc, asc, gte } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import {
  BookingStatusBadge,
  type BookingStatus as BadgeStatus,
} from "@/components/domain/BookingStatusBadge";
import { CURRENCY_SYMBOL } from "@/components/domain/country";
import { cn } from "@/components/ui/cn";
import { getCountry } from "@/components/domain/countryCookie";
import { EmptyState } from "@/components/domain/PageStates";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema/bookings";
import { providerProfiles } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { recurringSeries } from "@/lib/db/schema/bookings";
import { services } from "@/lib/db/schema/services";
import { getCurrentUser } from "@/lib/auth/server";

const TABS = ["upcoming", "past", "recurring"] as const;
type Tab = (typeof TABS)[number];

type DbStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed"
  | "released";

function badgeStatus(s: DbStatus): BadgeStatus {
  switch (s) {
    case "pending":      return "pending";
    case "confirmed":    return "confirmed";
    case "in_progress":  return "inProgress";
    case "completed":    return "completed";
    case "released":     return "completed";
    case "cancelled":    return "cancelledFull";
    case "disputed":     return "cancelledPartial";
  }
}

function statusTranslationKey(s: DbStatus): string {
  switch (s) {
    case "pending":      return "pending";
    case "confirmed":    return "confirmed";
    case "in_progress":  return "inProgress";
    case "completed":    return "completed";
    case "released":     return "completed";
    case "cancelled":    return "cancelledFull";
    case "disputed":     return "cancelledPartial";
  }
}

const HUES = [0, 1, 2, 3] as const;
function hueOf(id: string): (typeof HUES)[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % HUES.length;
  return HUES[h];
}

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

function formatWhen(d: Date, locale: string): string {
  return d.toLocaleString(locale === "en" ? "en-AU" : locale, {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

export default async function BookingsListPage({
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
  const t = await getTranslations("booking");
  const tStatus = await getTranslations("booking.status");
  const tNav = await getTranslations("nav");
  const country = await getCountry();
  const sym = CURRENCY_SYMBOL[country];

  const rawTab = typeof sp.tab === "string" ? sp.tab : "upcoming";
  const tab: Tab = (TABS as readonly string[]).includes(rawTab)
    ? (rawTab as Tab)
    : "upcoming";

  const now = new Date();

  const bookingRows =
    tab === "recurring"
      ? []
      : await db
          .select({
            id: bookings.id,
            scheduledAt: bookings.scheduledAt,
            status: bookings.status,
            totalPrice: bookings.totalPrice,
            providerName: users.name,
            providerEmail: users.email,
          })
          .from(bookings)
          .leftJoin(
            providerProfiles,
            eq(providerProfiles.id, bookings.providerId),
          )
          .leftJoin(users, eq(users.id, providerProfiles.userId))
          .where(
            and(
              eq(bookings.customerId, me.id),
              tab === "upcoming"
                ? and(
                    inArray(bookings.status, ACTIVE_STATUSES),
                    gte(bookings.scheduledAt, now),
                  )
                : tab === "past"
                  ? and(
                      inArray(bookings.status, PAST_STATUSES),
                    )
                  : undefined,
            ),
          )
          .orderBy(
            tab === "upcoming"
              ? asc(bookings.scheduledAt)
              : desc(bookings.scheduledAt),
          )
          .limit(50);

  const seriesRows =
    tab !== "recurring"
      ? []
      : await db
          .select({
            id: recurringSeries.id,
            frequency: recurringSeries.frequency,
            weekday: recurringSeries.weekday,
            hour: recurringSeries.hour,
            startDate: recurringSeries.startDate,
            endsAt: recurringSeries.endsAt,
            serviceCode: services.code,
          })
          .from(recurringSeries)
          .leftJoin(services, eq(services.id, recurringSeries.serviceId))
          .where(eq(recurringSeries.customerId, me.id))
          .orderBy(asc(recurringSeries.startDate))
          .limit(50);

  return (
    <>
      <Header country={country} signedIn={true} initials={me.initials} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content pb-[120px] sm:pb-12"
      >
        <nav
          aria-label={tNav("bookings")}
          className="flex border-b border-border bg-bg-surface"
        >
          {TABS.map((k) => {
            const on = k === tab;
            return (
              <Link
                key={k}
                href={`/bookings?tab=${k}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-1 items-center justify-center text-[15px] font-medium",
                  on
                    ? "border-b-[3px] border-brand font-bold text-brand"
                    : "text-text-secondary",
                )}
              >
                {t(
                  `tabs${k.charAt(0).toUpperCase() + k.slice(1)}` as Parameters<
                    typeof t
                  >[0],
                )}
              </Link>
            );
          })}
        </nav>

        {tab !== "recurring" && bookingRows.length === 0 && (
          <EmptyState
            title={tab === "upcoming" ? t("noUpcoming") : t("noPast")}
            hint={tab === "past" ? t("noPastHint") : undefined}
            cta={
              tab === "upcoming" ? (
                <Link
                  href="/services"
                  className="inline-flex h-14 items-center justify-center rounded-md bg-brand px-7 text-[17px] font-bold text-white"
                >
                  {t("bookAClean")}
                </Link>
              ) : undefined
            }
          />
        )}

        {tab !== "recurring" && bookingRows.length > 0 && (
          <ul className="flex flex-col gap-3 px-5 py-5">
            {bookingRows.map((b) => {
              const dispName =
                b.providerName || (b.providerEmail?.split("@")[0] ?? "—");
              const status = b.status as DbStatus;
              return (
                <li key={b.id}>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="flex items-start gap-3 rounded-lg border border-border bg-bg-surface p-4 shadow-card"
                  >
                    <ProviderAvatar
                      size={56}
                      hue={hueOf(b.id)}
                      initials={initialsOf(b.providerName, b.providerEmail ?? "?")}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-bold">{dispName}</p>
                      <p className="mt-0.5 text-[14px] text-text-tertiary">
                        {formatWhen(b.scheduledAt, locale)}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <BookingStatusBadge status={badgeStatus(status)}>
                          {tStatus(
                            statusTranslationKey(status) as Parameters<
                              typeof tStatus
                            >[0],
                          )}
                        </BookingStatusBadge>
                        <span className="text-[16px] font-bold text-brand">
                          {sym}
                          {Number(b.totalPrice).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {tab === "recurring" && seriesRows.length === 0 && (
          <EmptyState title={t("noRecurring")} hint={t("noRecurringHint")} />
        )}

        {tab === "recurring" && seriesRows.length > 0 && (
          <ul className="flex flex-col gap-3 px-5 py-5">
            {seriesRows.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-border bg-bg-surface p-4"
              >
                <p className="text-[16px] font-bold">{s.serviceCode || "—"}</p>
                <p className="mt-1 text-[14px] text-text-secondary">
                  {s.frequency} · day {s.weekday} · {String(s.hour).padStart(2, "0")}:00
                </p>
                <p className="mt-1 text-[12px] text-text-tertiary">
                  Since {s.startDate}
                  {s.endsAt
                    ? ` · ended ${new Date(s.endsAt).toISOString().slice(0, 10)}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
