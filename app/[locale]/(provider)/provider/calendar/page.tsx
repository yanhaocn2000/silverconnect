import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { eq, and, gte, lte } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema/bookings";
import {
  providerProfiles,
  providerBlockedTimes,
} from "@/lib/db/schema/providers";
import { getCurrentUser } from "@/lib/auth/server";

type DayKind = "booked" | "available" | "blocked" | "muted";

function parseYM(raw: string | string[] | undefined): { y: number; m: number } {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const match = typeof v === "string" ? v.match(/^(\d{4})-(\d{1,2})$/) : null;
  if (match) return { y: Number(match[1]), m: Number(match[2]) - 1 };
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() };
}

function buildGrid(y: number, m: number): { date: Date; inMonth: boolean }[] {
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(y, m, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, inMonth: d.getMonth() === m };
  });
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayKind(
  date: Date,
  jobDates: Set<string>,
  blockedDates: Set<string>,
  inMonth: boolean,
): DayKind {
  if (!inMonth) return "muted";
  const k = dayKey(date);
  if (jobDates.has(k)) return "booked";
  if (blockedDates.has(k)) return "blocked";
  return "available";
}

export default async function ProviderCalendarPage({
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

  const { y, m } = parseYM(sp.ym);
  const grid = buildGrid(y, m);
  const monthStart = new Date(y, m, 1);
  const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

  const [profile] = await db
    .select({ id: providerProfiles.id })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, me.id))
    .limit(1);

  let jobDates = new Set<string>();
  const blockedDates = new Set<string>();

  if (profile) {
    const jobRows = await db
      .select({ scheduledAt: bookings.scheduledAt })
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, profile.id),
          gte(bookings.scheduledAt, monthStart),
          lte(bookings.scheduledAt, monthEnd),
        ),
      );
    jobDates = new Set(jobRows.map((r) => dayKey(r.scheduledAt)));

    const blockedRows = await db
      .select({
        startsAt: providerBlockedTimes.startsAt,
        endsAt: providerBlockedTimes.endsAt,
      })
      .from(providerBlockedTimes)
      .where(eq(providerBlockedTimes.providerId, profile.id));
    for (const b of blockedRows) {
      const start = b.startsAt > monthStart ? b.startsAt : monthStart;
      const end = b.endsAt < monthEnd ? b.endsAt : monthEnd;
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      while (cursor <= end) {
        blockedDates.add(dayKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  const monthLabel = new Date(y, m, 1).toLocaleDateString(
    locale === "en" ? "en-AU" : locale,
    { year: "numeric", month: "long" },
  );

  const prev = new Date(y, m - 1, 1);
  const next = new Date(y, m + 1, 1);
  const fmtYM = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const dayKeys = [
    "weekMon",
    "weekTue",
    "weekWed",
    "weekThu",
    "weekFri",
    "weekSat",
    "weekSun",
  ] as const;

  return (
    <>
      <Header country={country} signedIn={true} initials={me.initials} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("calendarTitle")}</h1>

        <div className="mt-4 flex items-center gap-3">
          <Link
            href={`?ym=${fmtYM(prev)}`}
            aria-label={t("calendarPrev")}
            className="inline-flex h-12 w-12 items-center justify-center rounded-md border-[1.5px] border-border-strong bg-bg-surface text-text-primary"
          >
            <ChevronLeft size={20} aria-hidden />
          </Link>
          <p className="flex-1 text-center text-[18px] font-bold tabular-nums">
            {monthLabel}
          </p>
          <Link
            href={`?ym=${fmtYM(next)}`}
            aria-label={t("calendarNext")}
            className="inline-flex h-12 w-12 items-center justify-center rounded-md border-[1.5px] border-border-strong bg-bg-surface text-text-primary"
          >
            <ChevronRight size={20} aria-hidden />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[12px] font-semibold text-text-tertiary">
          {dayKeys.map((k) => (
            <div key={k}>{t(k)}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map(({ date, inMonth }) => {
            const k = dayKind(date, jobDates, blockedDates, inMonth);
            return (
              <Link
                key={date.toISOString()}
                href="/provider/availability"
                aria-disabled={k === "muted"}
                className={cellClass(k)}
              >
                <span className={k === "muted" ? "text-text-tertiary" : ""}>
                  {date.getDate()}
                </span>
                {k === "booked" && (
                  <span
                    aria-hidden
                    className="mt-0.5 h-1 w-1 rounded-full bg-brand"
                  />
                )}
              </Link>
            );
          })}
        </div>

        <ul className="mt-6 flex flex-wrap gap-4 text-[13px]">
          <Legend color="bg-brand" label={t("legendBooked")} />
          <Legend color="bg-success" label={t("legendAvailable")} />
          <Legend color="bg-text-tertiary" label={t("legendBlocked")} />
        </ul>
      </main>
    </>
  );
}

function cellClass(k: DayKind) {
  const base =
    "flex h-12 flex-col items-center justify-center rounded-md text-[14px] font-semibold tabular-nums";
  if (k === "muted") return `${base} bg-bg-surface text-text-tertiary`;
  if (k === "booked") return `${base} bg-brand-soft text-brand`;
  if (k === "blocked")
    return `${base} bg-bg-surface-2 text-text-tertiary line-through`;
  return `${base} bg-bg-surface text-text-primary border border-border`;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span>{label}</span>
    </li>
  );
}
