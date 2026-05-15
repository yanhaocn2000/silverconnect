import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect, notFound } from "next/navigation";
import { after } from "next/server";
import { eq, and } from "drizzle-orm";
import { Phone, MapPin, AlertTriangle, Check } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { DeclineJobModal } from "@/components/domain/DeclineJobModal";
import { getCountry } from "@/components/domain/countryCookie";
import { priceCountry } from "@/components/domain/pricing";
import { db } from "@/lib/db";
import { bookings, bookingChanges } from "@/lib/db/schema/bookings";
import { providerProfiles } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { addresses } from "@/lib/db/schema/customer-data";
import { services } from "@/lib/db/schema/services";
import { getCurrentUser } from "@/lib/auth/server";
import { getProviderActiveState } from "@/lib/provider/requireActiveProvider";
import { notifyAndEmail } from "@/lib/notifications/server";
import { buildBookingStatusEmail } from "@/components/domain/email";

type DbStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed"
  | "released";

type Action = "accept" | "decline" | "start" | "complete";

async function ensureProviderJob(
  bookingId: string,
  userId: string,
): Promise<{ booking: { id: string; status: DbStatus }; providerId: string } | null> {
  const [profile] = await db
    .select({ id: providerProfiles.id })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, userId))
    .limit(1);
  if (!profile) return null;
  const [b] = await db
    .select({ id: bookings.id, status: bookings.status })
    .from(bookings)
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.providerId, profile.id)),
    )
    .limit(1);
  if (!b) return null;
  return { booking: { id: b.id, status: b.status as DbStatus }, providerId: profile.id };
}

async function jobAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "") as Action;
  const reason = String(formData.get("reason") ?? "");
  const me = await getCurrentUser();
  if (!me) {
    nextRedirect(`/${locale}/auth/login`);
  }
  const owned = await ensureProviderJob(id, me.id);
  if (!owned) nextRedirect(`/${locale}/provider/jobs`);
  const from = owned.booking.status;

  // Accepting a *new* job requires an active (approved + cleared) provider.
  // start / complete / decline on jobs already in flight stay allowed so a
  // downgraded provider can wrap up existing work.
  if (action === "accept") {
    const state = await getProviderActiveState(me.id);
    if (!state?.active) {
      nextRedirect(`/${locale}/provider/onboarding-status`);
    }
  }

  // Validate transition
  const transitions: Record<Action, { from: DbStatus[]; to: DbStatus }> = {
    accept:   { from: ["pending"],     to: "confirmed" },
    decline:  { from: ["pending"],     to: "cancelled" },
    start:    { from: ["confirmed"],   to: "in_progress" },
    complete: { from: ["in_progress"], to: "completed" },
  };
  const rule = transitions[action];
  if (!rule || !rule.from.includes(from)) {
    nextRedirect(
      `/${locale}/provider/jobs/${id}?error=invalid_transition`,
    );
  }

  await db.transaction(async (tx) => {
    const patch: Record<string, unknown> = {
      status: rule.to,
      updatedAt: new Date(),
    };
    if (action === "accept") patch.confirmedAt = new Date();
    if (action === "start") patch.startedAt = new Date();
    if (action === "complete") patch.completedAt = new Date();
    if (action === "decline") {
      patch.cancelledAt = new Date();
      patch.cancelReason = reason || "provider_declined";
    }
    await tx.update(bookings).set(patch).where(eq(bookings.id, id));
    await tx.insert(bookingChanges).values({
      bookingId: id,
      type: action === "decline" ? "cancel" : "status_change",
      fromStatus: from,
      toStatus: rule.to,
      actorId: me.id,
      note: action === "decline" ? `Provider decline: ${reason || "—"}` : `Provider ${action}`,
    });
  });

  // Notify the customer about every transition. Deferred so the
  // redirect lands instantly.
  after(async () => {
    const [b] = await db
      .select({ customerId: bookings.customerId })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!b?.customerId) return;

    const titles: Record<Action, string> = {
      accept: "Provider accepted your booking",
      decline: "Provider declined — please rebook",
      start: "Your provider is on the way",
      complete: "Your service is complete",
    };
    const link = `/${locale}/bookings/${id}`;

    if (action === "decline") {
      await notifyAndEmail({
        userId: b.customerId,
        kind: "booking_update",
        title: titles.decline,
        link,
        relatedBookingId: id,
        email: buildBookingStatusEmail(
          "cancelled",
          process.env.NEXT_PUBLIC_APP_URL ?? "",
          id,
          locale,
        ),
      });
      return;
    }
    const emailStatus = action === "accept"
      ? "confirmed"
      : action === "start"
        ? "in_progress"
        : "completed";
    await notifyAndEmail({
      userId: b.customerId,
      kind: "booking_update",
      title: titles[action],
      link,
      relatedBookingId: id,
      email: buildBookingStatusEmail(
        emailStatus,
        process.env.NEXT_PUBLIC_APP_URL ?? "",
        id,
        locale,
      ),
    });
  });
  // After complete, leaving the provider on the same page is fine.
  // After decline, send them back to the jobs list.
  if (action === "decline") {
    nextRedirect(`/${locale}/provider/jobs?declined=1`);
  }
  nextRedirect(`/${locale}/provider/jobs/${id}`);
}

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

export default async function ProviderJobDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  setRequestLocale(locale);
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const country = await getCountry();
  const t = await getTranslations("provider");
  const tCategories = await getTranslations("categories");
  const tCommon = await getTranslations("common");

  const owned = await ensureProviderJob(id, me.id);
  if (!owned) notFound();

  // A not-yet-active provider can't act on a pending dispatch — send them to
  // the onboarding-status page. (Confirmed/in-progress/past jobs stay visible
  // so they can finish work in flight.)
  if (owned.booking.status === "pending") {
    const state = await getProviderActiveState(me.id);
    if (!state?.active) nextRedirect(`/${locale}/provider/onboarding-status`);
  }

  const [row] = await db
    .select({
      id: bookings.id,
      scheduledAt: bookings.scheduledAt,
      durationMin: bookings.durationMin,
      status: bookings.status,
      totalPrice: bookings.totalPrice,
      basePrice: bookings.basePrice,
      taxAmount: bookings.taxAmount,
      notes: bookings.notes,
      customerName: users.name,
      customerEmail: users.email,
      customerPhone: users.phone,
      addressLine1: addresses.line1,
      addressCity: addresses.city,
      addressState: addresses.state,
      addressPostcode: addresses.postcode,
      serviceCategory: services.categoryCode,
    })
    .from(bookings)
    .leftJoin(users, eq(users.id, bookings.customerId))
    .leftJoin(addresses, eq(addresses.id, bookings.addressId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(eq(bookings.id, id))
    .limit(1);

  if (!row) notFound();
  const status = row.status as DbStatus;

  const justCompleted = status === "completed";
  const isCancelled = status === "cancelled";

  const dateLabel = row.scheduledAt.toLocaleDateString(
    locale === "en" ? "en-AU" : locale,
    { weekday: "long", month: "short", day: "numeric" },
  );
  const timeLabel = row.scheduledAt.toLocaleTimeString(
    locale === "en" ? "en-AU" : locale,
    { hour: "2-digit", minute: "2-digit" },
  );

  const dispName =
    row.customerName || (row.customerEmail?.split("@")[0] ?? "—");
  const initials = initialsOf(row.customerName, row.customerEmail ?? "?");
  const addressStr = [
    row.addressLine1,
    row.addressCity,
    row.addressState,
    row.addressPostcode,
  ]
    .filter(Boolean)
    .join(", ");
  const serviceLabel = row.serviceCategory
    ? tCategories(row.serviceCategory as Parameters<typeof tCategories>[0])
    : "—";

  return (
    <>
      <Header
        country={country}
        back
        signedIn={true}
        initials={me.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[140px] pt-6 sm:pb-12"
      >
        <p className="text-[14px] font-semibold uppercase tracking-wide text-text-tertiary tabular-nums">
          {dateLabel} · {timeLabel}
        </p>
        <h1 className="mt-1 text-h2">{serviceLabel}</h1>

        {justCompleted && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success"
          >
            <Check size={18} aria-hidden /> {t("statusCompleted")}
          </div>
        )}

        {isCancelled && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-md border-[1.5px] border-warning bg-warning-soft p-3.5 text-warning"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p className="text-[14px] font-semibold">
              {t("cancelPolicyTitle")}
            </p>
          </div>
        )}

        <section className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-4">
          <ProviderAvatar size={56} hue={3} initials={initials} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">{dispName}</p>
            {row.customerPhone && (
              <p className="mt-0.5 text-[13px] text-text-tertiary tabular-nums">
                {row.customerPhone}
              </p>
            )}
          </div>
          {row.customerPhone && (
            <a
              href={`tel:${row.customerPhone}`}
              aria-label={t("jobCall")}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success"
            >
              <Phone size={20} aria-hidden />
            </a>
          )}
        </section>

        {addressStr && (
          <section className="mt-3 flex items-start gap-3 rounded-lg border border-border bg-bg-surface p-4">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand"
            >
              <MapPin size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{addressStr}</p>
            </div>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(addressStr)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-sm border-[1.5px] border-brand bg-bg-surface px-3 text-[14px] font-bold text-brand"
            >
              {t("jobNavigate")}
            </a>
          </section>
        )}

        {row.notes && (
          <section className="mt-3 rounded-lg border border-border bg-bg-surface p-4">
            <p className="text-[14px] font-bold">{t("jobNotes")}</p>
            <p className="mt-1 text-[15px] text-text-primary">{row.notes}</p>
          </section>
        )}

        <section className="mt-3 rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[14px] font-bold">{t("priceBreakdown")}</p>
          <dl className="mt-3 flex flex-col gap-1.5 text-[14px]">
            <Row label={t("priceBase")} value={priceCountry(country, Number(row.basePrice))} />
            <Row label="Tax" value={priceCountry(country, Number(row.taxAmount))} />
            <div className="my-1 h-px bg-border" />
            <Row
              label={t("priceTotal")}
              value={priceCountry(country, Number(row.totalPrice))}
              bold
            />
          </dl>
        </section>

        <Link
          href={`/safety/report?bookingId=${row.id}`}
          className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md border-[1.5px] border-danger bg-bg-surface text-[15px] font-bold text-danger"
        >
          {t("reportProblem")}
        </Link>

      </main>

      {!justCompleted && !isCancelled && (
        <ActionBar
          locale={locale}
          jobId={row.id}
          status={status}
          t={t}
          tCommon={tCommon}
        />
      )}
    </>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={bold ? "text-[15px] font-bold" : "text-text-secondary"}>
        {label}
      </dt>
      <dd className={"tabular-nums " + (bold ? "text-[16px] font-extrabold" : "")}>
        {value}
      </dd>
    </div>
  );
}

function ActionBar({
  locale,
  jobId,
  status,
  t,
  tCommon,
}: {
  locale: string;
  jobId: string;
  status: DbStatus;
  t: Awaited<ReturnType<typeof getTranslations<"provider">>>;
  tCommon: Awaited<ReturnType<typeof getTranslations<"common">>>;
}) {
  const acts: { key: Action; label: string; primary: boolean }[] =
    status === "pending"
      ? [{ key: "accept", label: t("jobAccept"), primary: true }]
      : status === "confirmed"
        ? [{ key: "start", label: t("jobOnTheWay"), primary: true }]
        : status === "in_progress"
          ? [{ key: "complete", label: t("jobComplete"), primary: true }]
          : [];

  const showDecline = status === "pending";
  if (acts.length === 0 && !showDecline) return null;

  const declineStrings = {
    triggerLabel: t("jobDecline"),
    title: t("declineTitle"),
    hint: t("declineHint"),
    reasonLegend: t("declineReason"),
    reasonOptions: (
      ["declineReason1", "declineReason2", "declineReason3", "declineReason4"] as const
    ).map((k) => ({ value: k, label: t(k) })),
    cancel: tCommon("cancel"),
    submit: t("jobDecline"),
  };

  return (
    <div className="fixed inset-x-0 bottom-[84px] z-20 border-t border-border bg-bg-surface px-5 py-3 sm:bottom-0">
      <div className="mx-auto flex max-w-content gap-3">
        {showDecline && (
          <DeclineJobModal
            action={jobAction}
            locale={locale}
            jobId={jobId}
            strings={declineStrings}
          />
        )}
        {acts.map((a) => (
          <form key={a.key} action={jobAction} className="flex-1">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={jobId} />
            <input type="hidden" name="action" value={a.key} />
            <button
              type="submit"
              className={
                "inline-flex h-12 w-full items-center justify-center rounded-md text-[15px] font-bold " +
                (a.primary
                  ? "bg-brand text-white"
                  : "border-[1.5px] border-border-strong bg-bg-surface text-text-primary")
              }
            >
              {a.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
