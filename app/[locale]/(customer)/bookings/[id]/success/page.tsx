import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect, notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { Calendar, MapPin, CreditCard } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { S5PaymentSuccess } from "@/components/illustrations";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { CURRENCY_SYMBOL } from "@/components/domain/country";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema/bookings";
import { providerProfiles } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { addresses } from "@/lib/db/schema/customer-data";
import { services } from "@/lib/db/schema/services";
import { getCurrentUser } from "@/lib/auth/server";

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations("success");
  const country = await getCountry();
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
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
    })
    .from(bookings)
    .leftJoin(providerProfiles, eq(providerProfiles.id, bookings.providerId))
    .leftJoin(users, eq(users.id, providerProfiles.userId))
    .leftJoin(addresses, eq(addresses.id, bookings.addressId))
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(and(eq(bookings.id, id), eq(bookings.customerId, me.id)))
    .limit(1);

  if (!row) notFound();

  const dispName =
    row.providerName || (row.providerEmail?.split("@")[0] ?? "—");
  const isPending = row.status === "pending";
  const headline = isPending ? t("processingTitle") : t("title");
  const subline = isPending
    ? t("processingHint")
    : t("providerAccepted", { name: dispName });

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

  const hours = Math.round((row.durationMin / 60) * 10) / 10;
  const serviceLine = `${row.serviceCode || "—"} · ${hours}h`;
  const totalStr = `${sym}${Number(row.totalPrice).toFixed(2)}`;

  return (
    <>
      <Header country={country} signedIn initials={me.initials} />
      <main id="main-content" className="mx-auto flex w-full max-w-content flex-col items-center bg-bg-surface px-5 pb-[120px] sm:pb-12 pt-2 text-center">
        <div className="mt-2.5">
          <S5PaymentSuccess width={240} height={170} />
        </div>
        <h1 className="mt-2 text-[28px] font-extrabold">{headline}</h1>
        <p className="mt-1.5 text-[16px] text-text-secondary">{subline}</p>

        <section className="mt-5 w-full rounded-lg border border-border bg-bg-surface p-4 text-left">
          <div className="flex items-center gap-2.5">
            <ProviderAvatar
              size={48}
              hue={0}
              initials={initialsOf(row.providerName, row.providerEmail ?? "?")}
            />
            <div>
              <p className="text-[16px] font-bold">{dispName}</p>
              <p className="text-[13px] text-text-tertiary">{serviceLine}</p>
            </div>
          </div>
          <ul className="mt-3.5 flex flex-col gap-2">
            <li className="flex items-center gap-2.5">
              <Calendar size={18} className="shrink-0 text-text-tertiary" aria-hidden />
              <span className="text-[15px]">{whenLabel}</span>
            </li>
            {addressStr && (
              <li className="flex items-center gap-2.5">
                <MapPin size={18} className="shrink-0 text-text-tertiary" aria-hidden />
                <span className="text-[15px]">{addressStr}</span>
              </li>
            )}
            <li className="flex items-center gap-2.5">
              <CreditCard size={18} className="shrink-0 text-text-tertiary" aria-hidden />
              <span className="text-[15px]">
                {isZh ? `已支付 ${totalStr}` : `Paid ${totalStr}`}
              </span>
            </li>
          </ul>
        </section>

        <div className="mt-3.5 flex w-full flex-col gap-2.5">
          <button
            type="button"
            className="flex h-14 items-center justify-center gap-2 rounded-md bg-brand text-[17px] font-bold text-white hover:bg-brand-hover"
          >
            <Calendar size={20} aria-hidden />
            {t("addCalendar")}
          </button>
          <button
            type="button"
            className="h-14 rounded-md border-[1.5px] border-border-strong bg-bg-surface text-[16px] font-semibold text-text-primary"
          >
            {t("downloadIcs")}
          </button>
          <Link
            href={`/bookings/${id}`}
            className="inline-flex h-12 items-center justify-center text-[15px] font-semibold text-brand"
          >
            {t("viewBooking")} →
          </Link>
        </div>
      </main>
    </>
  );
}
