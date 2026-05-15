import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { after } from "next/server";
import { eq, desc, inArray } from "drizzle-orm";
import { X, Clock, Check } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getAdmin } from "@/components/domain/adminCookie";
import { db } from "@/lib/db";
import { disputes, disputeMessages } from "@/lib/db/schema/disputes";
import { bookings, bookingChanges } from "@/lib/db/schema/bookings";
import { users } from "@/lib/db/schema/users";
import { providerProfiles } from "@/lib/db/schema/providers";
import { findUserByEmail } from "@/lib/auth/server";
import { notifyMany } from "@/lib/notifications/server";

type DbDisputeStatus = "open" | "evidence_needed" | "decided" | "closed";
type DbResolution =
  | "refund_full"
  | "refund_partial"
  | "denied"
  | "withdrawn";

type UiAction = "full" | "partial" | "reject" | "escalate";

function actionToPatch(
  action: UiAction,
  amountStr: string,
  bookingTotal: number,
):
  | { error: string }
  | {
      status: DbDisputeStatus;
      resolution?: DbResolution;
      resolutionAmount?: string | null;
      closedAt?: Date | null;
    } {
  if (action === "full") {
    return {
      status: "decided",
      resolution: "refund_full",
      closedAt: new Date(),
    };
  }
  if (action === "partial") {
    const amt = Number(amountStr);
    if (!Number.isFinite(amt) || amt <= 0 || amt > bookingTotal) {
      return { error: "invalidAmount" };
    }
    return {
      status: "decided",
      resolution: "refund_partial",
      resolutionAmount: amt.toFixed(2),
      closedAt: new Date(),
    };
  }
  if (action === "reject") {
    return {
      status: "decided",
      resolution: "denied",
      closedAt: new Date(),
    };
  }
  // escalate → keep open and ask for more evidence
  return { status: "evidence_needed" };
}

async function disputeDecisionAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "") as UiAction;
  const amountStr = String(formData.get("amount") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const admin = await getAdmin();
  if (!admin.signedIn) nextRedirect(`/${locale}/admin/login`);

  // Resolve admin user_id by email so we can attribute the action.
  const adminUser = admin.email ? await findUserByEmail(admin.email) : null;
  const adminId = adminUser?.id ?? null;

  const [d] = await db
    .select({
      id: disputes.id,
      bookingId: disputes.bookingId,
      status: disputes.status,
      bookingTotal: bookings.totalPrice,
      bookingStatus: bookings.status,
    })
    .from(disputes)
    .leftJoin(bookings, eq(bookings.id, disputes.bookingId))
    .where(eq(disputes.id, id))
    .limit(1);
  if (!d) nextRedirect(`/${locale}/admin/disputes?error=missing`);

  const total = Number(d.bookingTotal ?? 0);
  const patch = actionToPatch(action, amountStr, total);
  if ("error" in patch) {
    nextRedirect(`/${locale}/admin/disputes?id=${id}&error=${patch.error}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(disputes)
      .set({
        ...patch,
        decidedAt:
          patch.status === "decided" ? new Date() : null,
        decidedBy: patch.status === "decided" ? adminId : null,
        decisionNote: note || null,
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, id));

    if (note) {
      await tx.insert(disputeMessages).values({
        disputeId: id,
        authorId: adminId,
        body: `[Decision: ${action}] ${note}`,
        isAdminOnly: false,
      });
    }

    // If the dispute was decided in the customer's favour, flip the
    // booking out of disputed and back to a terminal state. For
    // partial / full refund we mark the booking cancelled (refund
    // mechanics ship with Stripe). For 'denied' we restore the prior
    // released-or-completed state if known, otherwise leave as-is.
    if (patch.status === "decided" && d.bookingId) {
      const newBookingStatus =
        action === "full" || action === "partial"
          ? "cancelled"
          : d.bookingStatus === "disputed"
            ? "completed"
            : (d.bookingStatus as never);
      if (newBookingStatus !== d.bookingStatus) {
        await tx
          .update(bookings)
          .set({
            status: newBookingStatus,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, d.bookingId));
        await tx.insert(bookingChanges).values({
          bookingId: d.bookingId,
          type: "status_change",
          fromStatus: d.bookingStatus as never,
          toStatus: newBookingStatus as never,
          actorId: adminId,
          note: `Admin dispute decision: ${action}`,
        });
      }
    }
  });

  // Notify both parties of the decision (best-effort; deferred).
  if (patch.status === "decided") {
    after(async () => {
      const [ctx] = await db
        .select({
          customerId: bookings.customerId,
          providerUserId: providerProfiles.userId,
        })
        .from(bookings)
        .leftJoin(
          providerProfiles,
          eq(providerProfiles.id, bookings.providerId),
        )
        .where(eq(bookings.id, d.bookingId!))
        .limit(1);
      const titleByAction: Record<UiAction, string> = {
        full: "Dispute decided: full refund",
        partial: "Dispute decided: partial refund",
        reject: "Dispute decided: claim denied",
        escalate: "Dispute escalated",
      };
      const title = titleByAction[action];
      const recipients = [
        ctx?.customerId,
        ctx?.providerUserId,
      ].filter(Boolean) as string[];
      await notifyMany(
        recipients.map((userId) => ({
          userId,
          kind: "dispute" as const,
          title,
          body: note || undefined,
          link: `/${locale}/bookings/${d.bookingId}`,
          relatedBookingId: d.bookingId!,
          relatedDisputeId: id,
        })),
      );
    });
  }
  nextRedirect(`/${locale}/admin/disputes?applied=${id.slice(0, 8)}`);
}

const STATUS_OPTIONS = [
  "all",
  "open",
  "evidence_needed",
  "decided",
  "closed",
] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

function statusBadgeClass(s: DbDisputeStatus): string {
  switch (s) {
    case "open":
      return "bg-danger-soft text-danger";
    case "evidence_needed":
      return "bg-warning-soft text-warning";
    case "decided":
      return "bg-success-soft text-success";
    case "closed":
      return "bg-bg-surface-2 text-text-tertiary";
  }
}

export default async function AdminDisputesPage({
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

  const rawStatus = typeof sp.status === "string" ? sp.status : "all";
  const fStatus: StatusFilter = (STATUS_OPTIONS as readonly string[]).includes(
    rawStatus,
  )
    ? (rawStatus as StatusFilter)
    : "all";
  const drawerId = typeof sp.id === "string" ? sp.id : null;
  const applied = typeof sp.applied === "string" ? sp.applied : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  const where =
    fStatus === "all"
      ? undefined
      : eq(disputes.status, fStatus as DbDisputeStatus);

  const rows = await db
    .select({
      id: disputes.id,
      status: disputes.status,
      reason: disputes.reason,
      createdAt: disputes.createdAt,
      bookingId: disputes.bookingId,
      bookingTotal: bookings.totalPrice,
      bookingCurrency: bookings.currency,
      customerId: bookings.customerId,
      providerUserId: providerProfiles.userId,
    })
    .from(disputes)
    .leftJoin(bookings, eq(bookings.id, disputes.bookingId))
    .leftJoin(
      providerProfiles,
      eq(providerProfiles.id, bookings.providerId),
    )
    .where(where)
    .orderBy(desc(disputes.createdAt))
    .limit(100);

  // Batch user lookup
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

  const drawerRow = drawerId ? rows.find((r) => r.id === drawerId) : null;
  let drawerMessages: { id: string; body: string; createdAt: Date; authorName: string | null }[] =
    [];
  if (drawerRow) {
    const msgs = await db
      .select({
        id: disputeMessages.id,
        body: disputeMessages.body,
        createdAt: disputeMessages.createdAt,
        authorId: disputeMessages.authorId,
      })
      .from(disputeMessages)
      .where(eq(disputeMessages.disputeId, drawerRow.id))
      .orderBy(disputeMessages.createdAt);
    drawerMessages = msgs.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      authorName: m.authorId ? (userMap.get(m.authorId) ?? null) : null,
    }));
  }

  return (
    <AdminShell email={admin.email ?? ""}>
      <div className="flex items-center justify-between">
        <h1 className="text-h2">{t("disputesTitle")}</h1>
      </div>

      {applied && (
        <div
          role="status"
          className="mt-3 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-2.5 text-[14px] font-semibold text-success"
        >
          <Check size={16} aria-hidden /> {t("applied")} · {applied}
        </div>
      )}
      {error === "invalidAmount" && (
        <div
          role="alert"
          className="mt-3 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
        >
          Partial refund must be greater than 0 and not exceed the booking total.
        </div>
      )}

      <form
        method="get"
        className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-bg-surface p-3"
      >
        <div>
          <Label htmlFor="status">{t("filterStatus")}</Label>
          <select
            id="status"
            name="status"
            defaultValue={fStatus}
            className="block h-10 rounded-md border-[1.5px] border-border bg-bg-surface px-3 text-[14px]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? t("filterAll") : s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="ml-auto inline-flex h-10 items-center rounded-md bg-brand px-4 text-[14px] font-bold text-white"
        >
          {t("filterApply")}
        </button>
      </form>

      <p className="mt-3 text-[12px] text-text-tertiary tabular-nums">
        {rows.length} {rows.length === 1 ? "case" : "cases"}
      </p>

      <div className="mt-2 overflow-hidden rounded-lg border border-border bg-bg-surface">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-text-tertiary">
            {t("emptyDisputes")}
          </p>
        ) : (
          <table className="w-full table-fixed text-left text-[13px]">
            <thead className="border-b border-border bg-bg-surface-2 text-text-secondary">
              <tr>
                <Th>{t("colId")}</Th>
                <Th>{t("colCustomer")}</Th>
                <Th className="hidden lg:table-cell">{t("colProvider")}</Th>
                <Th>{t("colAmount")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th>{t("colSla")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const status = d.status as DbDisputeStatus;
                const customer =
                  (d.customerId && userMap.get(d.customerId)) || "—";
                const provider =
                  (d.providerUserId && userMap.get(d.providerUserId)) || "—";
                return (
                  <tr
                    key={d.id}
                    className={
                      "border-b border-border last:border-b-0 " +
                      (drawerId === d.id ? "bg-brand-soft" : "")
                    }
                  >
                    <Td>
                      <Link
                        href={`?id=${d.id}`}
                        className="font-bold text-brand tabular-nums"
                      >
                        D-{d.id.slice(0, 8)}
                      </Link>
                    </Td>
                    <Td>{customer}</Td>
                    <Td className="hidden lg:table-cell">{provider}</Td>
                    <Td className="tabular-nums">
                      {d.bookingCurrency} {Number(d.bookingTotal ?? 0).toFixed(0)}
                    </Td>
                    <Td>
                      <span
                        className={
                          "inline-flex h-6 items-center rounded-sm px-2 text-[11px] font-bold uppercase tracking-wide " +
                          statusBadgeClass(status)
                        }
                      >
                        {status}
                      </span>
                    </Td>
                    <Td className="tabular-nums text-text-tertiary">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={13} aria-hidden />
                        {d.createdAt.toLocaleDateString(
                          locale === "en" ? "en-AU" : locale,
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {drawerRow && (
        <DisputeDrawer
          row={drawerRow}
          messages={drawerMessages}
          customerName={
            (drawerRow.customerId && userMap.get(drawerRow.customerId)) || "—"
          }
          providerName={
            (drawerRow.providerUserId &&
              userMap.get(drawerRow.providerUserId)) || "—"
          }
          locale={locale}
          t={t}
        />
      )}
    </AdminShell>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-[12px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`truncate px-4 py-3 ${className}`}>{children}</td>;
}

function DisputeDrawer({
  row,
  messages,
  customerName,
  providerName,
  locale,
  t,
}: {
  row: {
    id: string;
    status: string;
    reason: string;
    bookingId: string;
    bookingTotal: string | null;
    bookingCurrency: string | null;
  };
  messages: { id: string; body: string; createdAt: Date; authorName: string | null }[];
  customerName: string;
  providerName: string;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<"admin">>>;
}) {
  const total = Number(row.bookingTotal ?? 0);
  return (
    <>
      <Link
        href="/admin/disputes"
        aria-label={t("drawerClose")}
        className="fixed inset-0 z-40 bg-black/30"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("disputeDrawer")}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col overflow-y-auto border-l border-border bg-bg-surface shadow-xl"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-border bg-bg-surface px-5 py-3">
          <p className="text-[16px] font-bold tabular-nums">
            D-{row.id.slice(0, 8)}
          </p>
          <Link
            href="/admin/disputes"
            aria-label={t("drawerClose")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-bg-surface-2"
          >
            <X size={18} aria-hidden />
          </Link>
        </header>
        <div className="flex-1 px-5 py-5">
          <dl className="grid grid-cols-2 gap-2 text-[13px]">
            <div>
              <dt className="text-text-tertiary">{t("colCustomer")}</dt>
              <dd className="font-semibold">{customerName}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">{t("colProvider")}</dt>
              <dd className="font-semibold">{providerName}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">{t("colAmount")}</dt>
              <dd className="font-semibold tabular-nums">
                {row.bookingCurrency} {total.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-text-tertiary">{t("colStatus")}</dt>
              <dd className="font-semibold">{row.status}</dd>
            </div>
          </dl>

          <p className="mt-5 text-[14px] font-bold">{t("disputeTimeline")}</p>
          <p className="mt-2 whitespace-pre-line rounded-md border border-border bg-bg-surface-2 p-3 text-[14px] text-text-primary">
            {row.reason}
          </p>

          {messages.length > 0 && (
            <>
              <p className="mt-5 text-[14px] font-bold">Conversation</p>
              <ul className="mt-2 flex flex-col gap-2">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-md border border-border bg-bg-surface p-3 text-[13px]"
                  >
                    <p className="text-[12px] text-text-tertiary">
                      {m.authorName ?? "—"} ·{" "}
                      {m.createdAt.toLocaleString(locale === "en" ? "en-AU" : locale)}
                    </p>
                    <p className="mt-1 whitespace-pre-line">{m.body}</p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {row.status !== "decided" && row.status !== "closed" ? (
            <form
              action={disputeDecisionAction}
              className="mt-6 flex flex-col gap-4 border-t border-border pt-5"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={row.id} />
              <fieldset>
                <legend className="text-[14px] font-bold">
                  {t("disputeAction")}
                </legend>
                <ul className="mt-2 flex flex-col gap-2">
                  {(
                    [
                      { key: "full", label: t("disputeFullRefund") },
                      { key: "partial", label: t("disputePartialRefund") },
                      { key: "reject", label: t("disputeReject") },
                      { key: "escalate", label: t("disputeEscalate") },
                    ] as const
                  ).map((a) => (
                    <li key={a.key}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-border bg-bg-surface p-3 has-[:checked]:border-2 has-[:checked]:border-brand">
                        <input
                          type="radio"
                          name="action"
                          value={a.key}
                          required
                          defaultChecked={a.key === "full"}
                          className="peer sr-only"
                        />
                        <span
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong after:hidden after:h-2.5 after:w-2.5 after:rounded-full after:bg-brand after:content-[''] peer-checked:border-brand peer-checked:after:block"
                          aria-hidden
                        />
                        <span className="text-[14px]">{a.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              <div>
                <Label htmlFor="amount">{t("disputePartialAmount")}</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min={0}
                  max={total}
                  defaultValue={total.toFixed(2)}
                  inputMode="decimal"
                />
              </div>

              <div>
                <Label htmlFor="note">{t("disputeNote")}</Label>
                <textarea
                  id="note"
                  name="note"
                  rows={3}
                  aria-describedby="note-hint"
                  className="block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface p-3 text-[14px] focus:border-brand focus:outline-none"
                />
                <p
                  id="note-hint"
                  className="mt-1.5 text-[12px] text-text-tertiary"
                >
                  {t("disputeNoteHint")}
                </p>
              </div>

              <Button type="submit" variant="primary" block size="md">
                {t("disputeApply")}
              </Button>
            </form>
          ) : (
            <p className="mt-6 rounded-md bg-success-soft px-3.5 py-3 text-[14px] font-semibold text-success">
              Already decided.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
