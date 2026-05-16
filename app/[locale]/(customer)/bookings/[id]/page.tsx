import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect, notFound } from "next/navigation";
import { after } from "next/server";
import { eq, and } from "drizzle-orm";
import { Calendar, MapPin, CreditCard, Clock, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import {
  BookingStatusBadge,
  type BookingStatus as BadgeStatus,
} from "@/components/domain/BookingStatusBadge";
import { BookingTimeline } from "@/components/domain/BookingTimeline";
import { CURRENCY_SYMBOL } from "@/components/domain/country";
import { cn } from "@/components/ui/cn";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { bookings, bookingChanges } from "@/lib/db/schema/bookings";
import { providerProfiles } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { addresses } from "@/lib/db/schema/customer-data";
import { services } from "@/lib/db/schema/services";
import { getCurrentUser } from "@/lib/auth/server";
import { notify, notifyAndEmail } from "@/lib/notifications/server";
import { buildBookingStatusEmail } from "@/components/domain/email";
import { RescheduleModal } from "@/components/domain/RescheduleModal";

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

function statusKey(s: DbStatus): string {
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

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

async function rescheduleBookingAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id || !date || !time) {
    nextRedirect(`/${locale}/bookings/${id}?error=reschedule_invalid`);
  }
  const target = new Date(`${date}T${time}:00`);
  if (Number.isNaN(target.getTime())) {
    nextRedirect(`/${locale}/bookings/${id}?error=reschedule_invalid`);
  }
  const now = new Date();
  const minMs = 4 * 60 * 60 * 1000;
  const maxMs = 30 * 24 * 60 * 60 * 1000;
  if (target.getTime() < now.getTime() + minMs) {
    nextRedirect(`/${locale}/bookings/${id}?error=reschedule_too_soon`);
  }
  if (target.getTime() > now.getTime() + maxMs) {
    nextRedirect(`/${locale}/bookings/${id}?error=reschedule_too_far`);
  }

  const [row] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      scheduledAt: bookings.scheduledAt,
    })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.customerId, me.id)))
    .limit(1);
  if (!row) nextRedirect(`/${locale}/bookings`);
  const reschedulable: DbStatus[] = ["pending", "confirmed"];
  if (!(reschedulable as string[]).includes(row.status)) {
    nextRedirect(`/${locale}/bookings/${id}?error=reschedule_bad_status`);
  }

  const fromIso = row.scheduledAt.toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({ scheduledAt: target, updatedAt: new Date() })
      .where(eq(bookings.id, id));
    await tx.insert(bookingChanges).values({
      bookingId: id,
      type: "reschedule",
      fromStatus: row.status as DbStatus,
      toStatus: row.status as DbStatus,
      actorId: me.id,
      note: `Customer reschedule: ${fromIso} → ${target.toISOString()}`,
    });
  });

  after(async () => {
    const [b] = await db
      .select({ providerId: bookings.providerId })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!b?.providerId) return;
    const [p] = await db
      .select({ userId: providerProfiles.userId, locale: users.locale })
      .from(providerProfiles)
      .leftJoin(users, eq(users.id, providerProfiles.userId))
      .where(eq(providerProfiles.id, b.providerId))
      .limit(1);
    if (!p?.userId) return;
    const userLocale = p.locale ?? "en";
    await notifyAndEmail({
      userId: p.userId,
      kind: "booking_update",
      title: "Booking rescheduled",
      body: `Customer rescheduled to ${target.toLocaleString(userLocale === "en" ? "en-AU" : userLocale)}.`,
      link: `/${locale}/provider/jobs/${id}`,
      relatedBookingId: id,
      email: buildBookingStatusEmail(
        "confirmed",
        process.env.NEXT_PUBLIC_APP_URL ?? "",
        id,
        userLocale,
      ),
    });
  });

  nextRedirect(`/${locale}/bookings/${id}?rescheduled=1`);
}

async function cancelBookingAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id) nextRedirect(`/${locale}/bookings`);
  const [row] = await db
    .select({ id: bookings.id, status: bookings.status })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.customerId, me.id)))
    .limit(1);
  if (!row) nextRedirect(`/${locale}/bookings`);
  const cancellable: DbStatus[] = ["pending", "confirmed"];
  if (!(cancellable as string[]).includes(row.status)) {
    nextRedirect(`/${locale}/bookings/${id}?error=not_cancellable`);
  }
  await db.transaction(async (tx) => {
    await tx
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: "customer",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id));
    await tx.insert(bookingChanges).values({
      bookingId: id,
      type: "cancel",
      fromStatus: row.status as DbStatus,
      toStatus: "cancelled",
      actorId: me.id,
      note: "Customer cancellation",
    });
  });
  after(async () => {
    // Find the provider's user_id and notify them.
    const [b] = await db
      .select({ providerId: bookings.providerId })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (b?.providerId) {
      const [p] = await db
        .select({ userId: providerProfiles.userId })
        .from(providerProfiles)
        .where(eq(providerProfiles.id, b.providerId))
        .limit(1);
      if (p?.userId) {
        await notify({
          userId: p.userId,
          kind: "booking_update",
          title: "Booking cancelled",
          body: "The customer cancelled this booking.",
          link: `/${locale}/provider/jobs/${id}`,
          relatedBookingId: id,
        });
      }
    }
  });
  nextRedirect(`/${locale}/bookings`);
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  // Validate UUID before hitting the DB so malformed ids surface as 404
  // (not 500 from a Postgres uuid-cast error). pre-existing /[id] pages
  // crashed on garbage input — caught during Phase 4 E2E.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const t = await getTranslations("booking");
  const tStatus = await getTranslations("booking.status");
  const tCta = await getTranslations("booking.cta");
  const tCommon = await getTranslations("common");
  const country = await getCountry();
  const isZh = locale.startsWith("zh");
  const sym = CURRENCY_SYMBOL[country];

  const [row] = await db
    .select({
      id: bookings.id,
      scheduledAt: bookings.scheduledAt,
      durationMin: bookings.durationMin,
      status: bookings.status,
      totalPrice: bookings.totalPrice,
      currency: bookings.currency,
      providerName: users.name,
      providerEmail: users.email,
      addressLine1: addresses.line1,
      addressCity: addresses.city,
      addressState: addresses.state,
      addressPostcode: addresses.postcode,
      serviceCode: services.code,
      serviceCategory: services.categoryCode,
    })
    .from(bookings)
    .leftJoin(providerProfiles, eq(providerProfiles.id, bookings.providerId))
    .leftJoin(users, eq(users.id, providerProfiles.userId))
    .leftJoin(addresses, eq(addresses.id, bookings.addressId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(and(eq(bookings.id, id), eq(bookings.customerId, me.id)))
    .limit(1);

  if (!row) notFound();

  const status = row.status as DbStatus;
  const badge = badgeStatus(status);
  const dispName =
    row.providerName || (row.providerEmail?.split("@")[0] ?? "—");

  const whenLabel = row.scheduledAt.toLocaleString(
    isZh ? "zh-CN" : "en-AU",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  const addressStr = [
    row.addressLine1,
    row.addressCity,
    row.addressState,
    row.addressPostcode,
  ]
    .filter(Boolean)
    .join(" ");

  const cancellable: DbStatus[] = ["pending", "confirmed"];
  const showCancel = (cancellable as string[]).includes(status);
  const showReschedule = showCancel;

  const minMs = 4 * 60 * 60 * 1000;
  const nowMs = new Date().getTime();
  const rescheduleDefault = new Date(
    Math.max(row.scheduledAt.getTime(), nowMs + minMs + 60_000),
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultDate = `${rescheduleDefault.getFullYear()}-${pad(rescheduleDefault.getMonth() + 1)}-${pad(rescheduleDefault.getDate())}`;
  const defaultTime = `${pad(rescheduleDefault.getHours())}:${pad(rescheduleDefault.getMinutes())}`;
  const tomorrow = new Date(nowMs + minMs);
  const minDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  const maxBound = new Date(nowMs + 30 * 24 * 60 * 60 * 1000);
  const maxDate = `${maxBound.getFullYear()}-${pad(maxBound.getMonth() + 1)}-${pad(maxBound.getDate())}`;

  const cancelBar =
    status === "confirmed" ? (
      <p className="flex items-center gap-2 rounded-md bg-brand-soft px-3.5 py-3 text-[14px] text-brand">
        <Clock size={16} aria-hidden /> {t("cancelFreeUntil", { hours: 47 })}
      </p>
    ) : status === "in_progress" ? (
      <p className="rounded-md bg-warning-soft px-3.5 py-3 text-[14px] text-[#92590A]">
        {t("cantCancelInProgress")}
      </p>
    ) : null;

  return (
    <>
      <Header country={country} back signedIn={true} initials={me.initials} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content overflow-auto bg-bg-surface px-5 pb-[120px] sm:pb-12 pt-4"
      >
        <div className="mb-4 flex items-center gap-2">
          <BookingStatusBadge status={badge}>
            {tStatus(statusKey(status) as Parameters<typeof tStatus>[0])}
          </BookingStatusBadge>
          <span className="text-[13px] text-text-tertiary">
            #{row.id.slice(0, 8)}
          </span>
        </div>

        {cancelBar}

        <section className="mt-4 rounded-lg border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-3">
            <ProviderAvatar
              size={56}
              hue={0}
              initials={initialsOf(row.providerName, row.providerEmail ?? "?")}
            />
            <div className="flex-1">
              <p className="text-[17px] font-bold">{dispName}</p>
              <p className="text-[13px] uppercase tracking-wide text-text-tertiary">
                {(row.serviceCode || row.serviceCategory || "—").replace(
                  /_/g,
                  "-",
                )}{" "}
                · {Math.round(row.durationMin / 60 * 10) / 10}h
              </p>
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            <li className="flex items-center gap-2.5">
              <Calendar
                size={18}
                className="shrink-0 text-text-tertiary"
                aria-hidden
              />
              <span className="text-[15px]">{whenLabel}</span>
            </li>
            {addressStr && (
              <li className="flex items-center gap-2.5">
                <MapPin
                  size={18}
                  className="shrink-0 text-text-tertiary"
                  aria-hidden
                />
                <span className="text-[15px]">{addressStr}</span>
              </li>
            )}
            <li className="flex items-center gap-2.5">
              <CreditCard
                size={18}
                className="shrink-0 text-text-tertiary"
                aria-hidden
              />
              <span className="text-[15px]">
                {sym}
                {Number(row.totalPrice).toFixed(2)} {row.currency}
              </span>
            </li>
          </ul>
        </section>

        <h2 className="mb-2.5 mt-5 text-[16px] font-bold">
          {t("statusTimeline")}
        </h2>
        <BookingTimeline status={badge} />

        {(status === "confirmed" ||
          status === "in_progress" ||
          status === "completed") && (
          <Link
            href={`/bookings/${id}/dispute`}
            className="mt-5 block text-center text-[15px] font-semibold text-danger underline-offset-4 hover:underline"
          >
            {isZh ? "我有问题 → 报告" : "I have a problem → Report"}
          </Link>
        )}
      </main>

      <div className="sticky bottom-[84px] z-10 flex gap-2 border-t border-border bg-bg-surface p-3 sm:bottom-0">
        {showCancel && (
          <form action={cancelBookingAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              aria-label={tCommon("cancel")}
              className="inline-flex h-14 w-14 items-center justify-center rounded-md border-[1.5px] border-danger bg-bg-surface text-danger"
            >
              <X size={22} aria-hidden />
            </button>
          </form>
        )}
        {showReschedule && (
          <RescheduleModal
            action={rescheduleBookingAction}
            locale={locale}
            bookingId={id}
            defaultDate={defaultDate}
            defaultTime={defaultTime}
            minDate={minDate}
            maxDate={maxDate}
            strings={{
              triggerLabel: t("rescheduleCta"),
              title: t("rescheduleTitle"),
              hint: t("rescheduleHint"),
              dateLabel: t("rescheduleNewDate"),
              timeLabel: t("rescheduleNewTime"),
              cancel: tCommon("cancel"),
              submit: t("rescheduleConfirm"),
            }}
          />
        )}
        {status === "pending" ? (
          <Link
            href={`/pay/${id}`}
            className="flex h-14 flex-1 items-center justify-center rounded-md bg-brand text-[17px] font-bold text-white hover:bg-brand-hover"
          >
            {tCta(statusKey(status) as Parameters<typeof tCta>[0])}
          </Link>
        ) : status === "completed" ? (
          <Link
            href={`/bookings/${id}/feedback`}
            className="flex h-14 flex-1 items-center justify-center rounded-md bg-brand text-[17px] font-bold text-white hover:bg-brand-hover"
          >
            {tCta(statusKey(status) as Parameters<typeof tCta>[0])}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={cn(
              "flex h-14 flex-1 items-center justify-center rounded-md text-[17px] font-bold text-white",
              "bg-brand opacity-60",
            )}
          >
            {tCta(statusKey(status) as Parameters<typeof tCta>[0])}
          </button>
        )}
      </div>
    </>
  );
}
