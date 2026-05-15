import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { eq, and, desc, sql } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { getAdmin } from "@/components/domain/adminCookie";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { bookings } from "@/lib/db/schema/bookings";
import {
  addresses,
  emergencyContacts,
  familyMembers,
} from "@/lib/db/schema/customer-data";
import { reviews } from "@/lib/db/schema/reviews";
import { disputes } from "@/lib/db/schema/disputes";
import { services } from "@/lib/db/schema/services";

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  setRequestLocale(locale);
  const admin = await getAdmin();
  if (!admin.signedIn) redirect({ href: "/admin/login", locale });
  const tC = await getTranslations("aCustomers");
  const tD = await getTranslations("aCustomerDetail");
  const tCat = await getTranslations("categories");

  const [customer] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      country: users.country,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!customer || customer.role !== "customer") notFound();

  const [bookingAgg] = await db
    .select({
      n: sql<number>`count(*)::int`,
      spend: sql<number>`coalesce(sum(case when ${bookings.status} in ('completed','released') then ${bookings.totalPrice}::numeric else 0 end), 0)::float`,
    })
    .from(bookings)
    .where(eq(bookings.customerId, id));

  const recentBookings = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      totalPrice: bookings.totalPrice,
      scheduledAt: bookings.scheduledAt,
      categoryCode: services.categoryCode,
    })
    .from(bookings)
    .leftJoin(services, eq(services.id, bookings.serviceId))
    .where(eq(bookings.customerId, id))
    .orderBy(desc(bookings.scheduledAt))
    .limit(10);

  const [{ n: disputeCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(disputes)
    .innerJoin(bookings, eq(bookings.id, disputes.bookingId))
    .where(eq(bookings.customerId, id));

  const [{ n: familyCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(familyMembers)
    .where(eq(familyMembers.userId, id));

  const [{ n: addressCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(addresses)
    .where(eq(addresses.userId, id));

  const [{ n: emergencyCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(emergencyContacts)
    .where(eq(emergencyContacts.userId, id));

  const recentReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(and(eq(reviews.customerId, id), eq(reviews.status, "published")))
    .orderBy(desc(reviews.createdAt))
    .limit(5);

  const dispName = customer.name || customer.email.split("@")[0];
  const initials = initialsOf(customer.name, customer.email);
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale === "en" ? "en-AU" : locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <AdminShell email={admin.email ?? ""}>
      <Link
        href="/admin/customers"
        className="inline-flex h-10 items-center gap-1 text-[13px] font-semibold text-brand"
      >
        <ChevronLeft size={16} aria-hidden /> {tC("title")}
      </Link>

      <div className="mt-3 flex items-center gap-4 rounded-lg border border-border bg-bg-surface p-5">
        <ProviderAvatar size={72} hue={1} initials={initials} />
        <div className="min-w-0 flex-1">
          <h1 className="text-h2">{dispName}</h1>
          <p className="mt-0.5 text-[13px] text-text-tertiary">
            {customer.email}
          </p>
          <p className="mt-0.5 text-[12px] text-text-tertiary tabular-nums">
            {tC("registeredAt", { when: fmt(customer.createdAt) })} ·{" "}
            {customer.country}
          </p>
        </div>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={tD("bookings")} value={String(bookingAgg?.n ?? 0)} />
        <Stat
          label={tC("spend")}
          value={`$${Number(bookingAgg?.spend ?? 0).toFixed(0)}`}
        />
        <Stat label={tD("disputes")} value={String(disputeCount ?? 0)} />
        <Stat label={tD("family")} value={String(familyCount ?? 0)} />
      </section>

      <section className="mt-5 rounded-lg border border-border bg-bg-surface p-4">
        <p className="text-[14px] font-bold">{tD("bookings")}</p>
        {recentBookings.length === 0 ? (
          <p className="mt-2 text-[13px] text-text-tertiary">—</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {recentBookings.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between py-2.5 text-[13px]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {b.categoryCode
                      ? tCat(
                          b.categoryCode as Parameters<typeof tCat>[0],
                        )
                      : "—"}
                  </span>
                  <span className="text-[12px] text-text-tertiary tabular-nums">
                    {fmt(b.scheduledAt)} ·{" "}
                    <span className="uppercase">{b.status}</span>
                  </span>
                </span>
                <span className="tabular-nums font-semibold">
                  ${Number(b.totalPrice).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-border bg-bg-surface p-4">
        <p className="text-[14px] font-bold">Reviews given</p>
        {recentReviews.length === 0 ? (
          <p className="mt-2 text-[13px] text-text-tertiary">—</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {recentReviews.map((r) => (
              <li key={r.id} className="py-2.5 text-[13px]">
                <span className="block font-semibold tabular-nums">
                  {"★".repeat(r.rating)}
                  <span className="text-text-tertiary">
                    {"★".repeat(Math.max(0, 5 - r.rating))}
                  </span>{" "}
                  <span className="text-[12px] font-normal text-text-tertiary">
                    {fmt(r.createdAt)}
                  </span>
                </span>
                {r.comment && (
                  <span className="mt-0.5 block text-text-secondary">
                    {r.comment}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[12px] text-text-tertiary">Addresses</p>
          <p className="mt-1 text-[22px] font-extrabold tabular-nums">
            {addressCount}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[12px] text-text-tertiary">Emergency contacts</p>
          <p className="mt-1 text-[22px] font-extrabold tabular-nums">
            {emergencyCount}
          </p>
        </div>
      </section>

      <p className="mt-6 rounded-md bg-bg-surface-2 px-3.5 py-3 text-[13px] text-text-tertiary">
        Suspend / resume / ban + payments / devices / login-history actions
        ship with the user-management work in a follow-up wave.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["suspend", "resume", "ban"] as const).map((k) => (
          <button
            key={k}
            type="button"
            disabled
            className="inline-flex h-10 items-center rounded-md border-[1.5px] border-border bg-bg-surface px-4 text-[14px] font-bold text-text-tertiary opacity-60"
          >
            {tD(k)}
          </button>
        ))}
      </div>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="text-[12px] text-text-tertiary">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold tabular-nums">{value}</p>
    </div>
  );
}
