import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  eq,
  and,
  inArray,
  lt,
  desc,
  type SQL,
} from "drizzle-orm";
import { AlertTriangle } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { getAdmin } from "@/components/domain/adminCookie";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema/bookings";
import { providerProfiles } from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";

type DbStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed"
  | "released";

type AdminFilter = "all" | "stuck" | "escrow" | "released" | "cancelled";

const ESCROW_STATUSES: DbStatus[] = ["confirmed", "in_progress"];
const RELEASED_STATUSES: DbStatus[] = ["completed", "released"];

const FILTER_LABELS: Record<AdminFilter, string> = {
  all: "All",
  stuck: "Stuck > 24h",
  escrow: "In escrow",
  released: "Released",
  cancelled: "Cancelled",
};

const FILTER_BADGE: Record<DbStatus, string> = {
  pending: "bg-warning-soft text-warning",
  confirmed: "bg-brand-soft text-brand",
  in_progress: "bg-brand-soft text-brand",
  completed: "bg-success-soft text-success",
  released: "bg-success-soft text-success",
  cancelled: "bg-bg-surface-2 text-text-secondary",
  disputed: "bg-danger-soft text-danger",
};

function buildWhere(filter: AdminFilter): SQL | undefined {
  if (filter === "stuck") {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return and(
      eq(bookings.status, "pending"),
      lt(bookings.createdAt, dayAgo),
    );
  }
  if (filter === "escrow")
    return inArray(bookings.status, ESCROW_STATUSES);
  if (filter === "released")
    return inArray(bookings.status, RELEASED_STATUSES);
  if (filter === "cancelled") return eq(bookings.status, "cancelled");
  return undefined;
}

export default async function AdminBookingsPage({
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
  const tB = await getTranslations("aBookings");

  const rawFilter = typeof sp.filter === "string" ? sp.filter : "all";
  const filter: AdminFilter = (
    ["all", "stuck", "escrow", "released", "cancelled"] as const
  ).includes(rawFilter as AdminFilter)
    ? (rawFilter as AdminFilter)
    : "all";

  const where = buildWhere(filter);

  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      createdAt: bookings.createdAt,
      scheduledAt: bookings.scheduledAt,
      totalPrice: bookings.totalPrice,
      currency: bookings.currency,
      customerId: bookings.customerId,
      providerUserId: providerProfiles.userId,
    })
    .from(bookings)
    .leftJoin(providerProfiles, eq(providerProfiles.id, bookings.providerId))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(100);

  // Batch-fetch user display names for both customers and providers.
  const userIds = Array.from(
    new Set(
      [
        ...rows.map((r) => r.customerId),
        ...rows.map((r) => r.providerUserId).filter(Boolean),
      ] as string[],
    ),
  );
  const userRows = userIds.length
    ? await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const userMap = new Map(
    userRows.map((u) => [u.id, u.name || u.email.split("@")[0]]),
  );

  // Captured at request time so the JSX map below stays pure. This
  // file is a Server Component — runs once per request — so reading
  // the wall clock once here is intentional. The compiler can't tell
  // RSC from CSR so we suppress.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  const filters: { key: AdminFilter; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "stuck", label: tB("filterStuck") },
    { key: "escrow", label: tB("filterEscrow") },
    { key: "released", label: FILTER_LABELS.released },
    { key: "cancelled", label: FILTER_LABELS.cancelled },
  ];

  return (
    <AdminShell email={admin.email ?? ""}>
      <h1 className="text-h2">{tB("title")}</h1>
      <p className="mt-1 text-[15px] text-text-secondary">{tB("sub")}</p>

      <nav role="tablist" className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => {
          const on = f.key === filter;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "?" : `?filter=${f.key}`}
              role="tab"
              aria-selected={on}
              className={
                "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 text-[13px] font-semibold " +
                (on
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border-strong bg-bg-surface text-text-primary")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <p className="mt-3 text-[12px] text-text-tertiary tabular-nums">
        {rows.length} row{rows.length === 1 ? "" : "s"}
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((b) => {
          const min = Math.max(
            0,
            Math.round((nowMs - b.createdAt.getTime()) / 60000),
          );
          const status = b.status as DbStatus;
          const stuck =
            status === "pending" && nowMs - b.createdAt.getTime() > 24 * 60 * 60 * 1000;
          return (
            <li
              key={b.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-3"
            >
              {stuck && (
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning"
                >
                  <AlertTriangle size={16} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold tabular-nums">
                  #{b.id.slice(0, 8)}
                </p>
                <p className="mt-0.5 text-[12px] text-text-secondary">
                  {userMap.get(b.customerId) ?? "—"}
                  {" → "}
                  {(b.providerUserId && userMap.get(b.providerUserId)) || "—"}
                </p>
              </div>
              <span className="tabular-nums text-[13px] font-bold">
                {b.currency} {Number(b.totalPrice).toFixed(0)}
              </span>
              <span
                className={
                  "inline-flex h-6 items-center rounded-sm px-2 text-[11px] font-bold uppercase tracking-wide " +
                  FILTER_BADGE[status]
                }
              >
                {status}
              </span>
              <span className="hidden text-[12px] text-text-tertiary tabular-nums sm:inline">
                {tB("minutesAgo", { n: min })}
              </span>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
