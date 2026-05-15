import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound, redirect as nextRedirect } from "next/navigation";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { ChevronLeft, Check } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getAdmin } from "@/components/domain/adminCookie";
import { db } from "@/lib/db";
import { disputes, disputeMessages, disputeEvidence } from "@/lib/db/schema/disputes";
import { bookings, bookingChanges } from "@/lib/db/schema/bookings";
import { users } from "@/lib/db/schema/users";
import { providerProfiles } from "@/lib/db/schema/providers";
import { findUserByEmail } from "@/lib/auth/server";
import { notifyAndEmail } from "@/lib/notifications/server";
import { buildDisputeUpdateEmail } from "@/components/domain/email";

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
    nextRedirect(
      `/${locale}/admin/disputes/${id}?error=${patch.error}`,
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(disputes)
      .set({
        ...patch,
        decidedAt: patch.status === "decided" ? new Date() : null,
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
          .set({ status: newBookingStatus, updatedAt: new Date() })
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
      const link = `/${locale}/bookings/${d.bookingId}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

      for (const userId of recipients) {
        const [u] = await db
          .select({ locale: users.locale })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        const userLocale = u?.locale ?? "en";
        await notifyAndEmail({
          userId,
          kind: "dispute",
          title,
          body: note || undefined,
          link,
          relatedBookingId: d.bookingId!,
          relatedDisputeId: id,
          email: buildDisputeUpdateEmail(appUrl, id, userLocale, "decided"),
        });
      }
    });
  }
  nextRedirect(`/${locale}/admin/disputes/${id}?applied=1`);
}

function statusBadgeClass(s: string): string {
  switch (s) {
    case "open":
      return "bg-danger-soft text-danger";
    case "evidence_needed":
      return "bg-warning-soft text-warning";
    case "decided":
      return "bg-success-soft text-success";
    default:
      return "bg-bg-surface-2 text-text-tertiary";
  }
}

export default async function AdminDisputeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  const sp = await searchParams;
  setRequestLocale(locale);
  const admin = await getAdmin();
  if (!admin.signedIn) redirect({ href: "/admin/login", locale });
  const t = await getTranslations("admin");

  const applied = sp.applied === "1";
  const error = typeof sp.error === "string" ? sp.error : null;

  const [row] = await db
    .select({
      id: disputes.id,
      status: disputes.status,
      reason: disputes.reason,
      resolution: disputes.resolution,
      resolutionAmount: disputes.resolutionAmount,
      decisionNote: disputes.decisionNote,
      decidedAt: disputes.decidedAt,
      createdAt: disputes.createdAt,
      bookingId: disputes.bookingId,
      bookingStatus: bookings.status,
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
    .where(eq(disputes.id, id))
    .limit(1);
  if (!row) notFound();

  const customer = row.customerId
    ? (
        await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, row.customerId))
          .limit(1)
      )[0]
    : null;
  const provider = row.providerUserId
    ? (
        await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, row.providerUserId))
          .limit(1)
      )[0]
    : null;

  const messages = await db
    .select({
      id: disputeMessages.id,
      body: disputeMessages.body,
      createdAt: disputeMessages.createdAt,
      authorId: disputeMessages.authorId,
      isAdminOnly: disputeMessages.isAdminOnly,
    })
    .from(disputeMessages)
    .where(eq(disputeMessages.disputeId, id))
    .orderBy(disputeMessages.createdAt);

  const evidence = await db
    .select({
      id: disputeEvidence.id,
      kind: disputeEvidence.kind,
      fileUrl: disputeEvidence.fileUrl,
      note: disputeEvidence.note,
      createdAt: disputeEvidence.createdAt,
      uploadedBy: disputeEvidence.uploadedBy,
    })
    .from(disputeEvidence)
    .where(eq(disputeEvidence.disputeId, id))
    .orderBy(disputeEvidence.createdAt);

  const total = Number(row.bookingTotal ?? 0);
  const customerName = customer?.name || customer?.email.split("@")[0] || "—";
  const providerName = provider?.name || provider?.email.split("@")[0] || "—";
  const isClosed = row.status === "decided" || row.status === "closed";

  return (
    <AdminShell email={admin.email ?? ""}>
      <Link
        href="/admin/disputes"
        className="inline-flex h-10 items-center gap-1 text-[13px] font-semibold text-brand"
      >
        <ChevronLeft size={16} aria-hidden /> {t("disputesTitle")}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h2 tabular-nums">D-{row.id.slice(0, 8)}</h1>
        <span
          className={
            "inline-flex h-7 items-center rounded-sm px-2.5 text-[12px] font-bold uppercase tracking-wide " +
            statusBadgeClass(row.status)
          }
        >
          {row.status}
        </span>
      </div>

      {applied && (
        <div
          role="status"
          className="mt-3 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-2.5 text-[14px] font-semibold text-success"
        >
          <Check size={16} aria-hidden /> {t("applied")}
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

      <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[12px] text-text-tertiary">{t("colCustomer")}</p>
          <p className="mt-0.5 text-[15px] font-bold">{customerName}</p>
          {customer && (
            <p className="text-[12px] text-text-tertiary">{customer.email}</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[12px] text-text-tertiary">{t("colProvider")}</p>
          <p className="mt-0.5 text-[15px] font-bold">{providerName}</p>
          {provider && (
            <p className="text-[12px] text-text-tertiary">{provider.email}</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[12px] text-text-tertiary">Booking</p>
          <Link
            href={`/admin/bookings?id=${row.bookingId}`}
            className="mt-0.5 block text-[15px] font-bold text-brand tabular-nums"
          >
            B-{row.bookingId.slice(0, 8)}
          </Link>
          <p className="text-[12px] text-text-tertiary uppercase">
            {row.bookingStatus}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[12px] text-text-tertiary">{t("colAmount")}</p>
          <p className="mt-0.5 text-[15px] font-bold tabular-nums">
            {row.bookingCurrency} {total.toFixed(2)}
          </p>
          {row.resolutionAmount && (
            <p className="text-[12px] text-text-tertiary tabular-nums">
              Refund: {Number(row.resolutionAmount).toFixed(2)}
            </p>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-border bg-bg-surface p-5">
        <p className="text-[14px] font-bold">{t("disputeTimeline")}</p>
        <p className="mt-2 whitespace-pre-line rounded-md border border-border bg-bg-surface-2 p-3 text-[14px] text-text-primary">
          {row.reason}
        </p>
      </section>

      {messages.length > 0 && (
        <section className="mt-5 rounded-lg border border-border bg-bg-surface p-5">
          <p className="text-[14px] font-bold">Conversation</p>
          <ul className="mt-2 flex flex-col gap-2">
            {messages.map((m) => (
              <li
                key={m.id}
                className={
                  "rounded-md border border-border p-3 text-[13px] " +
                  (m.isAdminOnly ? "bg-warning-soft" : "bg-bg-surface")
                }
              >
                <p className="text-[12px] text-text-tertiary">
                  {m.createdAt.toLocaleString(
                    locale === "en" ? "en-AU" : locale,
                  )}
                  {m.isAdminOnly ? " · admin-only" : ""}
                </p>
                <p className="mt-1 whitespace-pre-line">{m.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {evidence.length > 0 && (
        <section className="mt-5 rounded-lg border border-border bg-bg-surface p-5">
          <p className="text-[14px] font-bold">Evidence</p>
          <ul className="mt-2 flex flex-col gap-2 text-[13px]">
            {evidence.map((e) => (
              <li
                key={e.id}
                className="rounded-md border border-border bg-bg-surface-2 p-3"
              >
                <p className="text-[12px] text-text-tertiary uppercase">
                  {e.kind} ·{" "}
                  {e.createdAt.toLocaleString(
                    locale === "en" ? "en-AU" : locale,
                  )}
                </p>
                {e.fileUrl && (
                  <a
                    href={e.fileUrl}
                    target="_blank"
                    rel="noopener"
                    className="mt-1 block break-all font-semibold text-brand"
                  >
                    {e.fileUrl}
                  </a>
                )}
                {e.note && <p className="mt-1 whitespace-pre-line">{e.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isClosed ? (
        <form
          action={disputeDecisionAction}
          className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-bg-surface p-5"
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
        <section className="mt-6 rounded-lg border border-border bg-success-soft p-5">
          <p className="text-[14px] font-bold text-success">
            Decided · {row.resolution ?? "—"}
          </p>
          {row.decidedAt && (
            <p className="mt-1 text-[12px] text-text-tertiary tabular-nums">
              {row.decidedAt.toLocaleString(
                locale === "en" ? "en-AU" : locale,
              )}
            </p>
          )}
          {row.decisionNote && (
            <p className="mt-2 whitespace-pre-line text-[14px]">
              {row.decisionNote}
            </p>
          )}
        </section>
      )}
    </AdminShell>
  );
}
