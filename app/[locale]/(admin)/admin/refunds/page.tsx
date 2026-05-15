import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { Check, RotateCcw } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { getAdmin } from "@/components/domain/adminCookie";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { refunds, payments } from "@/lib/db/schema/payments";
import { bookings } from "@/lib/db/schema/bookings";
import { users } from "@/lib/db/schema/users";

async function processRefund(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") nextRedirect(`/${locale}/admin/login`);
  if (!id) nextRedirect(`/${locale}/admin/refunds?error=invalid`);
  // Mark as processing. The actual Stripe refund call is handled by the
  // Stripe integration (lib/stripe + /api/refunds) — see UNFINISHED.md.
  // For now this just flips the status so admins can track manual
  // resolutions.
  await db
    .update(refunds)
    .set({ status: "processing" })
    .where(eq(refunds.id, id));
  nextRedirect(`/${locale}/admin/refunds?applied=${id}`);
}

export default async function AdminRefundsPage({
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

  const applied = typeof sp.applied === "string" ? sp.applied : null;

  const rows = await db
    .select({
      id: refunds.id,
      bookingId: payments.bookingId,
      customerName: users.name,
      customerEmail: users.email,
      amount: refunds.amount,
      currency: payments.currency,
      reason: refunds.reason,
      status: refunds.status,
      createdAt: refunds.createdAt,
    })
    .from(refunds)
    .leftJoin(payments, eq(payments.id, refunds.paymentId))
    .leftJoin(bookings, eq(bookings.id, payments.bookingId))
    .leftJoin(users, eq(users.id, bookings.customerId))
    .orderBy(desc(refunds.createdAt))
    .limit(200);

  const reasonLabel = (raw: string | null) => {
    if (!raw) return "—";
    if (raw.includes("dispute")) return t("reasonDispute");
    return t("reasonSelfService");
  };

  const statusKey = (s: string) =>
    s === "pending" || s === "queued"
      ? "refundQueued"
      : s === "processing"
        ? "refundProcessing"
        : s === "succeeded" || s === "done"
          ? "refundDone"
          : "refundFailed";

  return (
    <AdminShell email={admin.email ?? ""}>
      <h1 className="text-h2">{t("refundsTitle")}</h1>

      {applied && (
        <div
          role="status"
          className="mt-3 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-2.5 text-[14px] font-semibold text-success"
        >
          <Check size={16} aria-hidden /> {t("applied")} · {applied.slice(0, 8)}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-lg border border-border bg-bg-surface">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-text-tertiary">
            {t("refundEmpty")}
          </p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-bg-surface-2 text-text-secondary">
              <tr>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {t("colId")}
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {t("colBooking")}
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {t("colCustomer")}
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {t("colAmount")}
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {t("colReason")}
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {t("colStatus")}
                </th>
                <th className="px-4 py-3" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sk = statusKey(r.status);
                const cls =
                  sk === "refundQueued"
                    ? "bg-warning-soft text-warning"
                    : sk === "refundProcessing"
                      ? "bg-brand-soft text-brand"
                      : sk === "refundDone"
                        ? "bg-success-soft text-success"
                        : "bg-danger-soft text-danger";
                const customerLabel =
                  r.customerName ||
                  r.customerEmail?.split("@")[0] ||
                  "—";
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-bold tabular-nums">
                      {r.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {r.bookingId?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="px-4 py-3">{customerLabel}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {Number(r.amount).toFixed(2)}{" "}
                      {r.currency?.toUpperCase() ?? ""}
                    </td>
                    <td className="px-4 py-3">{reasonLabel(r.reason)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex h-6 items-center rounded-sm px-2 text-[11px] font-bold uppercase " +
                          cls
                        }
                      >
                        {t(sk as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sk === "refundQueued" ? (
                        <form action={processRefund} className="inline">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center gap-1 rounded-sm bg-brand px-3 text-[12px] font-bold text-white"
                          >
                            <RotateCcw size={12} aria-hidden />
                            {t("refundProcess")}
                          </button>
                        </form>
                      ) : (
                        <span aria-hidden className="text-text-tertiary">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
