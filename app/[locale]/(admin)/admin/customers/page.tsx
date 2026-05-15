import { setRequestLocale, getTranslations } from "next-intl/server";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { X } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { getAdmin } from "@/components/domain/adminCookie";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { bookings } from "@/lib/db/schema/bookings";

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

export default async function AdminCustomersPage({
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
  const tC = await getTranslations("aCustomers");

  const drawerId = typeof sp.id === "string" ? sp.id : null;

  // Pull customer users + their booking stats.
  const customerRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      country: users.country,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "customer"))
    .orderBy(desc(users.createdAt))
    .limit(100);

  // Aggregate bookings per customer (count + lifetime spend on
  // completed/released).
  const customerIds = customerRows.map((c) => c.id);
  const stats = customerIds.length
    ? await db
        .select({
          customerId: bookings.customerId,
          n: sql<number>`count(*)::int`,
          spend: sql<number>`coalesce(sum(case when ${bookings.status} in ('completed','released') then ${bookings.totalPrice}::numeric else 0 end), 0)::float`,
        })
        .from(bookings)
        .where(inArray(bookings.customerId, customerIds))
        .groupBy(bookings.customerId)
    : [];
  const statMap = new Map(
    stats.map((s) => [s.customerId, { n: s.n, spend: Number(s.spend) }]),
  );

  const drawerCustomer = drawerId
    ? customerRows.find((c) => c.id === drawerId)
    : null;

  return (
    <AdminShell email={admin.email ?? ""}>
      <h1 className="text-h2">{tC("title")}</h1>

      <p className="mt-3 text-[12px] text-text-tertiary tabular-nums">
        {customerRows.length}{" "}
        {customerRows.length === 1 ? "customer" : "customers"}
      </p>

      <div className="mt-2 overflow-hidden rounded-lg border border-border bg-bg-surface">
        {customerRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-text-tertiary">
            No customers yet
          </p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-bg-surface-2 text-text-secondary">
              <tr>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {t("colCustomer")}
                </th>
                <th className="hidden px-4 py-3 text-[12px] font-semibold uppercase tracking-wide md:table-cell">
                  {t("colCountry")}
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {tC("bookings")}
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {tC("spend")}
                </th>
              </tr>
            </thead>
            <tbody>
              {customerRows.map((c) => {
                const initials = initialsOf(c.name, c.email);
                const dispName = c.name || c.email.split("@")[0];
                const s = statMap.get(c.id);
                return (
                  <tr
                    key={c.id}
                    className={
                      "border-b border-border last:border-b-0 " +
                      (c.id === drawerId ? "bg-brand-soft" : "")
                    }
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`?id=${c.id}`}
                        className="flex items-center gap-3"
                      >
                        <ProviderAvatar
                          size={36}
                          hue={1}
                          initials={initials}
                        />
                        <span className="min-w-0">
                          <span className="block font-bold text-brand">
                            {dispName}
                          </span>
                          <span className="block text-[12px] text-text-tertiary">
                            {c.email}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {c.country}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{s?.n ?? 0}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {(s?.spend ?? 0).toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {drawerCustomer && (
        <CustomerDrawer
          item={drawerCustomer}
          stats={statMap.get(drawerCustomer.id)}
          locale={locale}
          t={t}
          tC={tC}
        />
      )}
    </AdminShell>
  );
}

function CustomerDrawer({
  item,
  stats,
  locale,
  t,
  tC,
}: {
  item: {
    id: string;
    name: string | null;
    email: string;
    country: string;
    createdAt: Date;
  };
  stats: { n: number; spend: number } | undefined;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<"admin">>>;
  tC: Awaited<ReturnType<typeof getTranslations<"aCustomers">>>;
}) {
  const dispName = item.name || item.email.split("@")[0];
  return (
    <>
      <Link
        href="/admin/customers"
        aria-label={t("drawerClose")}
        className="fixed inset-0 z-40 bg-black/30"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={tC("drawer")}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col overflow-y-auto border-l border-border bg-bg-surface shadow-xl"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-border bg-bg-surface px-5 py-3">
          <p className="text-[16px] font-bold">{dispName}</p>
          <Link
            href="/admin/customers"
            aria-label={t("drawerClose")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-bg-surface-2"
          >
            <X size={18} aria-hidden />
          </Link>
        </header>
        <div className="flex-1 px-5 py-5">
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[14px]">
            <dt className="font-semibold text-text-tertiary">
              {tC("colEmail")}
            </dt>
            <dd className="break-all">{item.email}</dd>
            <dt className="font-semibold text-text-tertiary">
              {t("colCountry")}
            </dt>
            <dd>{item.country}</dd>
            <dt className="font-semibold text-text-tertiary">
              {tC("colRegistered")}
            </dt>
            <dd className="tabular-nums">
              {item.createdAt.toLocaleDateString(
                locale === "en" ? "en-AU" : locale,
                { month: "short", day: "numeric", year: "numeric" },
              )}
            </dd>
            <dt className="font-semibold text-text-tertiary">
              {tC("bookings")}
            </dt>
            <dd className="tabular-nums">{stats?.n ?? 0}</dd>
            <dt className="font-semibold text-text-tertiary">
              {tC("spend")}
            </dt>
            <dd className="tabular-nums">{(stats?.spend ?? 0).toFixed(0)}</dd>
          </dl>

          <Link
            href={`/admin/customers/${item.id}`}
            className="mt-5 inline-flex h-10 items-center rounded-sm border-[1.5px] border-brand bg-bg-surface px-3 text-[13px] font-semibold text-brand"
          >
            {tC("viewFull")}
          </Link>

          <p className="mt-6 rounded-md bg-bg-surface-2 px-3.5 py-3 text-[13px] text-text-tertiary">
            Reset password / merge / GDPR-delete actions ship with the
            user-management work in a follow-up wave.
          </p>
        </div>
      </aside>
    </>
  );
}
