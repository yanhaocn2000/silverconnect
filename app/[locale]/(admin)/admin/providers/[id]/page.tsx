import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound, redirect as nextRedirect } from "next/navigation";
import { after } from "next/server";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import { ChevronLeft, Check } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { getAdmin } from "@/components/domain/adminCookie";
import { db } from "@/lib/db";
import {
  providerProfiles,
  providerDocuments,
  providerCategories,
  providerBackgroundChecks,
  complianceWebhookEvents,
} from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { adminActions } from "@/lib/db/schema/admin";
import { bookings } from "@/lib/db/schema/bookings";
import { reviews } from "@/lib/db/schema/reviews";
import { disputes } from "@/lib/db/schema/disputes";
import { wallets } from "@/lib/db/schema/payments";
import { findUserByEmail } from "@/lib/auth/server";
import { notify, notifyAndEmail } from "@/lib/notifications/server";
import { buildProviderApprovalEmail } from "@/components/domain/email";
import { tryAutoApproveProvider } from "@/lib/provider/autoApprove";
import {
  retryBackgroundCheck,
} from "@/lib/provider/backgroundCheck";

type DbStatus =
  | "pending"
  | "docs_review"
  | "approved"
  | "rejected"
  | "suspended";
type UiAction =
  | "approve"
  | "forceApprove"
  | "sendBack"
  | "hold"
  | "reject"
  | "suspend"
  | "resume";

function statusBadgeClass(s: DbStatus): string {
  switch (s) {
    case "pending":
      return "bg-bg-surface-2 text-text-secondary";
    case "docs_review":
      return "bg-warning-soft text-warning";
    case "approved":
      return "bg-success-soft text-success";
    case "rejected":
    case "suspended":
      return "bg-danger-soft text-danger";
  }
}

function initialsOf(name: string | null, fallback: string): string {
  const src = (name || fallback).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (src.slice(0, 2) || "?").toUpperCase();
}

async function providerDecisionAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "") as UiAction;
  const note = String(formData.get("note") ?? "").trim();
  const admin = await getAdmin();
  if (!admin.signedIn) nextRedirect(`/${locale}/admin/login`);

  const adminUser = admin.email ? await findUserByEmail(admin.email) : null;

  const [row] = await db
    .select({ id: providerProfiles.id, userId: providerProfiles.userId })
    .from(providerProfiles)
    .where(eq(providerProfiles.id, id))
    .limit(1);
  if (!row) nextRedirect(`/${locale}/admin/providers?error=missing`);

  // "Approve" no longer rubber-stamps: it re-runs the auto-approval check,
  // which only promotes if every gate for the provider's country is met.
  if (action === "approve") {
    await tryAutoApproveProvider(id);
    const [after2] = await db
      .select({ s: providerProfiles.onboardingStatus })
      .from(providerProfiles)
      .where(eq(providerProfiles.id, id))
      .limit(1);
    if (after2?.s === "approved") {
      nextRedirect(`/${locale}/admin/providers/${id}?applied=1`);
    }
    nextRedirect(`/${locale}/admin/providers/${id}?error=conditionsNotMet`);
  }

  // "Force approve" bypasses the checks — requires a justification note and
  // is recorded in the admin audit log.
  if (action === "forceApprove" && !note) {
    nextRedirect(`/${locale}/admin/providers/${id}?error=noteRequired`);
  }

  const patches: Record<
    Exclude<UiAction, "approve">,
    Partial<{
      onboardingStatus: DbStatus;
      approvedAt: Date | null;
      rejectedAt: Date | null;
      rejectionReason: string | null;
    }>
  > = {
    forceApprove: {
      onboardingStatus: "approved",
      approvedAt: new Date(),
      rejectedAt: null,
      rejectionReason: null,
    },
    sendBack: { onboardingStatus: "docs_review" },
    hold: { onboardingStatus: "docs_review" },
    reject: {
      onboardingStatus: "rejected",
      rejectedAt: new Date(),
      rejectionReason: note || "Rejected by admin",
    },
    suspend: {
      onboardingStatus: "suspended",
      rejectionReason: note || "Suspended by admin",
    },
    resume: {
      onboardingStatus: "approved",
      approvedAt: new Date(),
      rejectionReason: null,
    },
  };
  const patch = patches[action];
  if (!patch) {
    nextRedirect(`/${locale}/admin/providers/${id}?error=invalid`);
  }

  await db
    .update(providerProfiles)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(providerProfiles.id, id));

  if (action === "forceApprove") {
    await db.insert(adminActions).values({
      adminId: adminUser?.id ?? null,
      action: "provider.force_approve",
      targetType: "provider_profile",
      targetId: id,
      notes: note,
      metadata: { bypassedChecks: true },
    });
  }

  after(async () => {
    if (!row.userId) return;
    const titles: Record<Exclude<UiAction, "approve">, string> = {
      forceApprove: "Your provider application is approved",
      sendBack: "Action needed on your provider application",
      hold: "Your provider application is on hold",
      reject: "Your provider application was declined",
      suspend: "Your provider account has been suspended",
      resume: "Your provider account has been reinstated",
    };
    const link = `/${locale}/provider/onboarding-status`;

    if (action === "forceApprove" || action === "reject") {
      const [u] = await db
        .select({ locale: users.locale })
        .from(users)
        .where(eq(users.id, row.userId))
        .limit(1);
      const userLocale = u?.locale ?? "en";
      await notifyAndEmail({
        userId: row.userId,
        kind: "system",
        title: titles[action],
        body: note || undefined,
        link,
        email: buildProviderApprovalEmail(
          process.env.NEXT_PUBLIC_APP_URL ?? "",
          userLocale,
          action === "forceApprove",
          note || undefined,
        ),
      });
      return;
    }
    await notify({
      userId: row.userId,
      kind: "system",
      title: titles[action],
      body: note || undefined,
      link,
    });
  });

  nextRedirect(`/${locale}/admin/providers/${id}?applied=1`);
}

async function reviewDocumentAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const providerId = String(formData.get("providerId") ?? "");
  const docId = String(formData.get("docId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const admin = await getAdmin();
  if (!admin.signedIn) nextRedirect(`/${locale}/admin/login`);
  if (decision !== "approve" && decision !== "reject") {
    nextRedirect(`/${locale}/admin/providers/${providerId}?error=invalid`);
  }
  if (decision === "reject" && !note) {
    nextRedirect(`/${locale}/admin/providers/${providerId}?error=noteRequired`);
  }
  const adminUser = admin.email ? await findUserByEmail(admin.email) : null;

  const [docRow] = await db
    .select({
      id: providerDocuments.id,
      providerId: providerDocuments.providerId,
      type: providerDocuments.type,
    })
    .from(providerDocuments)
    .where(
      and(eq(providerDocuments.id, docId), eq(providerDocuments.providerId, providerId)),
    )
    .limit(1);
  if (!docRow) {
    nextRedirect(`/${locale}/admin/providers/${providerId}?error=missingDoc`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(providerDocuments)
      .set({
        status: decision === "approve" ? "approved" : "rejected",
        reviewedAt: new Date(),
        reviewerNote: note || null,
        updatedAt: new Date(),
      })
      .where(eq(providerDocuments.id, docId));
    await tx.insert(adminActions).values({
      adminId: adminUser?.id ?? null,
      action:
        decision === "approve"
          ? "provider.document_approved"
          : "provider.document_rejected",
      targetType: "provider_document",
      targetId: docId,
      notes: note || null,
      metadata: { providerId, documentType: docRow.type },
    });
  });

  // Tell the provider their document was reviewed.
  after(async () => {
    const [p] = await db
      .select({ userId: providerProfiles.userId })
      .from(providerProfiles)
      .where(eq(providerProfiles.id, providerId))
      .limit(1);
    if (!p?.userId) return;
    await notify({
      userId: p.userId,
      kind: "system",
      title:
        decision === "approve"
          ? "A compliance document was approved"
          : "A compliance document needs your attention",
      body: decision === "reject" ? note : undefined,
      link: `/${locale}/provider/compliance`,
    });
  });

  // An approved document may complete the set — re-evaluate auto-approval.
  if (decision === "approve") {
    after(() => tryAutoApproveProvider(providerId));
  }

  nextRedirect(
    `/${locale}/admin/providers/${providerId}?applied=1`,
  );
}

async function retryBgCheckAdminAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const admin = await getAdmin();
  if (!admin.signedIn) nextRedirect(`/${locale}/admin/login`);
  await retryBackgroundCheck(id);
  nextRedirect(`/${locale}/admin/providers/${id}?applied=1`);
}

/**
 * Re-process an orphaned/failed background-check webhook event: re-match by
 * external ref, apply the status, and re-evaluate auto-approval. If the row
 * still doesn't exist, the event stays orphaned.
 */
async function replayWebhookEventAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const providerId = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const admin = await getAdmin();
  if (!admin.signedIn) nextRedirect(`/${locale}/admin/login`);

  const [evt] = await db
    .select({
      id: complianceWebhookEvents.id,
      externalRef: complianceWebhookEvents.externalRef,
      payload: complianceWebhookEvents.payload,
    })
    .from(complianceWebhookEvents)
    .where(eq(complianceWebhookEvents.id, eventId))
    .limit(1);
  if (!evt || !evt.externalRef) {
    nextRedirect(`/${locale}/admin/providers/${providerId}?error=replayFailed`);
  }

  const [check] = await db
    .select({
      id: providerBackgroundChecks.id,
      providerId: providerBackgroundChecks.providerId,
    })
    .from(providerBackgroundChecks)
    .where(eq(providerBackgroundChecks.externalRef, evt.externalRef))
    .limit(1);
  if (!check) {
    nextRedirect(`/${locale}/admin/providers/${providerId}?error=replayNoRow`);
  }

  const payload = (evt.payload ?? {}) as { status?: string };
  const status =
    payload.status === "cleared"
      ? "cleared"
      : payload.status === "failed"
        ? "failed"
        : "pending";
  await db
    .update(providerBackgroundChecks)
    .set({
      status,
      clearedAt: status === "cleared" ? new Date() : null,
      rawPayload: evt.payload,
      updatedAt: new Date(),
    })
    .where(eq(providerBackgroundChecks.id, check.id));
  await db
    .update(complianceWebhookEvents)
    .set({ status: "processed", processedAt: new Date() })
    .where(eq(complianceWebhookEvents.id, evt.id));
  if (status === "cleared") {
    after(() => tryAutoApproveProvider(check.providerId));
  }
  nextRedirect(`/${locale}/admin/providers/${providerId}?applied=1`);
}

export default async function AdminProviderDetailPage({
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
  const tCat = await getTranslations("categories");
  const applied = sp.applied === "1";
  const errorCode = typeof sp.error === "string" ? sp.error : null;

  const [row] = await db
    .select({
      id: providerProfiles.id,
      userId: providerProfiles.userId,
      onboardingStatus: providerProfiles.onboardingStatus,
      addressLine: providerProfiles.addressLine,
      serviceRadiusKm: providerProfiles.serviceRadiusKm,
      stripeAccountId: providerProfiles.stripeAccountId,
      bio: providerProfiles.bio,
      abn: providerProfiles.abn,
      businessName: providerProfiles.businessName,
      abnActive: providerProfiles.abnActive,
      abnValidatedAt: providerProfiles.abnValidatedAt,
      bgCheckConsentAt: providerProfiles.bgCheckConsentAt,
      bgCheckConsentVersion: providerProfiles.bgCheckConsentVersion,
      bgCheckConsentIp: providerProfiles.bgCheckConsentIp,
      submittedAt: providerProfiles.submittedAt,
      approvedAt: providerProfiles.approvedAt,
      rejectedAt: providerProfiles.rejectedAt,
      rejectionReason: providerProfiles.rejectionReason,
      createdAt: providerProfiles.createdAt,
      providerName: users.name,
      providerEmail: users.email,
      providerCountry: users.country,
    })
    .from(providerProfiles)
    .leftJoin(users, eq(users.id, providerProfiles.userId))
    .where(eq(providerProfiles.id, id))
    .limit(1);
  if (!row) notFound();

  const [docs, cats, bookingAgg, ratingAgg, recentBookings, recentReviews, disputeCount, wallet] =
    await Promise.all([
      db
        .select({
          id: providerDocuments.id,
          type: providerDocuments.type,
          status: providerDocuments.status,
          fileUrl: providerDocuments.fileUrl,
          documentNumber: providerDocuments.documentNumber,
          reviewerNote: providerDocuments.reviewerNote,
        })
        .from(providerDocuments)
        .where(eq(providerDocuments.providerId, id)),
      db
        .select({ category: providerCategories.category })
        .from(providerCategories)
        .where(eq(providerCategories.providerId, id)),
      db
        .select({
          n: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${bookings.status} in ('completed','released'))::int`,
          revenue: sql<number>`coalesce(sum(case when ${bookings.status} in ('completed','released') then ${bookings.totalPrice}::numeric else 0 end), 0)::float`,
        })
        .from(bookings)
        .where(eq(bookings.providerId, id)),
      db
        .select({
          avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
          n: sql<number>`count(*)::int`,
        })
        .from(reviews)
        .where(
          and(eq(reviews.providerId, id), eq(reviews.status, "published")),
        ),
      db
        .select({
          id: bookings.id,
          status: bookings.status,
          scheduledAt: bookings.scheduledAt,
          totalPrice: bookings.totalPrice,
        })
        .from(bookings)
        .where(eq(bookings.providerId, id))
        .orderBy(desc(bookings.scheduledAt))
        .limit(8),
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .where(
          and(eq(reviews.providerId, id), eq(reviews.status, "published")),
        )
        .orderBy(desc(reviews.createdAt))
        .limit(5),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(disputes)
        .innerJoin(bookings, eq(bookings.id, disputes.bookingId))
        .where(eq(bookings.providerId, id)),
      db
        .select({
          held: wallets.balancePending,
          paid: wallets.balanceAvailable,
          currency: wallets.currency,
        })
        .from(wallets)
        .where(eq(wallets.providerId, id))
        .limit(1),
    ]);

  const [bgCheck] = await db
    .select({
      vendor: providerBackgroundChecks.vendor,
      externalRef: providerBackgroundChecks.externalRef,
      status: providerBackgroundChecks.status,
      requestedAt: providerBackgroundChecks.requestedAt,
      clearedAt: providerBackgroundChecks.clearedAt,
      expiresAt: providerBackgroundChecks.expiresAt,
      lastError: providerBackgroundChecks.lastError,
    })
    .from(providerBackgroundChecks)
    .where(
      and(
        eq(providerBackgroundChecks.providerId, id),
        eq(providerBackgroundChecks.isCurrent, true),
      ),
    )
    .limit(1);

  const deadLetters = await db
    .select({
      id: complianceWebhookEvents.id,
      vendor: complianceWebhookEvents.vendor,
      externalRef: complianceWebhookEvents.externalRef,
      status: complianceWebhookEvents.status,
      error: complianceWebhookEvents.error,
      receivedAt: complianceWebhookEvents.receivedAt,
    })
    .from(complianceWebhookEvents)
    .where(inArray(complianceWebhookEvents.status, ["orphaned", "failed"]))
    .orderBy(desc(complianceWebhookEvents.receivedAt))
    .limit(20);

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const [recentAgg] = await db
    .select({
      n: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(case when ${bookings.status} in ('completed','released') then ${bookings.totalPrice}::numeric else 0 end), 0)::float`,
    })
    .from(bookings)
    .where(
      and(eq(bookings.providerId, id), gte(bookings.scheduledAt, since30)),
    );

  const status = row.onboardingStatus as DbStatus;
  const dispName = row.providerName || row.providerEmail?.split("@")[0] || "—";
  const initials = initialsOf(row.providerName, row.providerEmail ?? "?");
  const isApproved = status === "approved";
  const isSuspended = status === "suspended";
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale === "en" ? "en-AU" : locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <AdminShell email={admin.email ?? ""}>
      <Link
        href="/admin/providers"
        className="inline-flex h-10 items-center gap-1 text-[13px] font-semibold text-brand"
      >
        <ChevronLeft size={16} aria-hidden /> {t("providersTitle")}
      </Link>

      {applied && (
        <div
          role="status"
          className="mt-2 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-2.5 text-[14px] font-semibold text-success"
        >
          <Check size={16} aria-hidden /> {t("applied")}
        </div>
      )}
      {errorCode && (
        <div
          role="alert"
          className="mt-2 rounded-md bg-danger-soft px-3.5 py-2.5 text-[14px] font-semibold text-danger"
        >
          {errorCode === "noteRequired"
            ? "A reason / note is required."
            : errorCode === "missingDoc"
              ? "Document not found."
              : errorCode === "conditionsNotMet"
                ? "Can't approve yet — background check, required documents, ABN (AU) and Stripe payouts must all be in order. Use Force approve to override."
                : errorCode === "replayNoRow"
                  ? "Still no matching background-check row for that event."
                  : errorCode === "replayFailed"
                    ? "Couldn't replay that webhook event."
                    : "Something went wrong — please try again."}
        </div>
      )}

      <header className="mt-3 flex flex-wrap items-start gap-4 rounded-lg border border-border bg-bg-surface p-5">
        <ProviderAvatar size={72} hue={1} initials={initials} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h2">{dispName}</h1>
            <span
              className={
                "inline-flex h-7 items-center rounded-sm px-2.5 text-[12px] font-bold uppercase " +
                statusBadgeClass(status)
              }
            >
              {status}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-text-tertiary">
            {row.providerEmail}
          </p>
          <p className="mt-0.5 text-[12px] text-text-tertiary tabular-nums">
            {row.providerCountry} · Applied {fmt(row.submittedAt ?? row.createdAt)}
          </p>
          {cats.length > 0 && (
            <p className="mt-2 text-[13px] text-text-secondary">
              {cats
                .map((c) =>
                  tCat(c.category as Parameters<typeof tCat>[0]),
                )
                .join(" · ")}
            </p>
          )}
          {row.bio && (
            <p className="mt-2 whitespace-pre-line text-[13px] text-text-secondary">
              {row.bio}
            </p>
          )}
          {row.rejectionReason && (status === "rejected" || isSuspended) && (
            <p className="mt-2 rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">
              {row.rejectionReason}
            </p>
          )}
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t("colBookings")}
          value={String(bookingAgg[0]?.n ?? 0)}
          sub={`${bookingAgg[0]?.completed ?? 0} done`}
        />
        <Stat
          label="Revenue (lifetime)"
          value={`$${Number(bookingAgg[0]?.revenue ?? 0).toFixed(0)}`}
          sub={`30d: $${Number(recentAgg?.revenue ?? 0).toFixed(0)}`}
        />
        <Stat
          label="Rating"
          value={
            (ratingAgg[0]?.n ?? 0) > 0
              ? Number(ratingAgg[0].avg).toFixed(1)
              : "—"
          }
          sub={`${ratingAgg[0]?.n ?? 0} reviews`}
        />
        <Stat label="Disputes" value={String(disputeCount[0]?.n ?? 0)} />
      </section>

      <section className="mt-5 rounded-lg border border-border bg-bg-surface p-5">
        <p className="text-[14px] font-bold">Wallet</p>
        {wallet[0] ? (
          <p className="mt-2 grid grid-cols-2 gap-4 text-[14px]">
            <span>
              <span className="block text-[12px] text-text-tertiary">Held</span>
              <span className="block font-semibold tabular-nums">
                {wallet[0].currency} {Number(wallet[0].held).toFixed(2)}
              </span>
            </span>
            <span>
              <span className="block text-[12px] text-text-tertiary">
                Available
              </span>
              <span className="block font-semibold tabular-nums">
                {wallet[0].currency} {Number(wallet[0].paid).toFixed(2)}
              </span>
            </span>
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-text-tertiary">No wallet yet</p>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-border bg-bg-surface p-5">
        <p className="text-[14px] font-bold">Compliance documents</p>
        {docs.length === 0 ? (
          <p className="mt-2 text-[13px] text-text-tertiary">None uploaded</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="py-3 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold uppercase">
                      {d.type}
                    </span>
                    {d.documentNumber && (
                      <span className="block text-[12px] text-text-tertiary tabular-nums">
                        {d.documentNumber}
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      "inline-flex h-6 items-center rounded-sm px-2 text-[11px] font-bold uppercase " +
                      (d.status === "approved"
                        ? "bg-success-soft text-success"
                        : d.status === "rejected"
                          ? "bg-danger-soft text-danger"
                          : "bg-warning-soft text-warning")
                    }
                  >
                    {d.status}
                  </span>
                  {d.fileUrl && (
                    <a
                      href={`/api/compliance/documents/${d.id}`}
                      target="_blank"
                      rel="noopener"
                      className="text-[12px] font-semibold text-brand"
                    >
                      open
                    </a>
                  )}
                </div>
                {d.reviewerNote && (
                  <p className="mt-1 text-[12px] text-text-tertiary">
                    Note: {d.reviewerNote}
                  </p>
                )}
                <form
                  action={reviewDocumentAction}
                  className="mt-2 flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="providerId" value={id} />
                  <input type="hidden" name="docId" value={d.id} />
                  <input
                    name="note"
                    placeholder="Reason (required to reject)"
                    defaultValue=""
                    className="h-8 min-w-0 flex-1 rounded-sm border border-border bg-bg-surface px-2 text-[12px]"
                  />
                  <button
                    type="submit"
                    name="decision"
                    value="approve"
                    className="h-8 rounded-sm bg-success-soft px-3 text-[12px] font-semibold text-success"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="reject"
                    className="h-8 rounded-sm bg-danger-soft px-3 text-[12px] font-semibold text-danger"
                  >
                    Reject
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-border bg-bg-surface p-5">
        <p className="text-[14px] font-bold">Compliance &amp; verification</p>
        <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
          {(row.providerCountry === "AU" || row.abn) && (
            <>
              <div>
                <dt className="text-text-tertiary">ABN</dt>
                <dd className="font-semibold tabular-nums">
                  {row.abn ?? "—"}
                  {row.abn != null && (
                    <span
                      className={
                        "ml-2 rounded-sm px-1.5 py-0.5 text-[11px] font-bold uppercase " +
                        (row.abnActive
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger")
                      }
                    >
                      {row.abnActive ? "active" : "inactive"}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-text-tertiary">Registered business</dt>
                <dd className="font-semibold">{row.businessName ?? "—"}</dd>
              </div>
            </>
          )}
          <div>
            <dt className="text-text-tertiary">Background check</dt>
            <dd className="font-semibold">
              {bgCheck ? (
                <>
                  <span className="uppercase">{bgCheck.status}</span>{" "}
                  <span className="font-normal text-text-tertiary">
                    ({bgCheck.vendor}
                    {bgCheck.externalRef ? ` · ${bgCheck.externalRef}` : ""})
                  </span>
                  {bgCheck.clearedAt && (
                    <span className="ml-1 font-normal text-text-tertiary">
                      cleared {fmt(bgCheck.clearedAt)}
                    </span>
                  )}
                  {bgCheck.expiresAt && (
                    <span className="ml-1 font-normal text-text-tertiary">
                      · expires {fmt(bgCheck.expiresAt)}
                    </span>
                  )}
                  {bgCheck.lastError && (
                    <span className="ml-1 font-normal text-danger">
                      · {bgCheck.lastError}
                    </span>
                  )}
                </>
              ) : (
                "not started"
              )}
            </dd>
            {bgCheck && (bgCheck.status === "failed" || bgCheck.status === "expired") && (
              <form action={retryBgCheckAdminAction} className="mt-1.5">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="h-8 rounded-sm bg-brand-soft px-3 text-[12px] font-semibold text-brand"
                >
                  Re-run background check
                </button>
              </form>
            )}
          </div>
          <div>
            <dt className="text-text-tertiary">Background check consent</dt>
            <dd className="font-semibold">
              {row.bgCheckConsentAt ? (
                <span className="font-normal text-text-secondary tabular-nums">
                  {fmt(row.bgCheckConsentAt)} · v{row.bgCheckConsentVersion ?? "?"}
                  {row.bgCheckConsentIp ? ` · ${row.bgCheckConsentIp}` : ""}
                </span>
              ) : (
                "not given"
              )}
            </dd>
          </div>
        </dl>

        {deadLetters.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[13px] font-bold text-danger">
              Webhook events needing attention
            </p>
            <ul className="mt-2 divide-y divide-border">
              {deadLetters.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 py-2 text-[12px]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold uppercase">{e.status}</span>{" "}
                    <span className="text-text-tertiary tabular-nums">
                      {e.vendor} · {e.externalRef ?? "no ref"} · {fmt(e.receivedAt)}
                    </span>
                    {e.error && (
                      <span className="block text-danger">{e.error}</span>
                    )}
                  </span>
                  <form action={replayWebhookEventAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="eventId" value={e.id} />
                    <button
                      type="submit"
                      className="h-8 rounded-sm bg-brand-soft px-3 font-semibold text-brand"
                    >
                      Replay
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-border bg-bg-surface p-5">
        <p className="text-[14px] font-bold">Recent bookings</p>
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
                  <span className="block font-semibold tabular-nums">
                    B-{b.id.slice(0, 8)}
                  </span>
                  <span className="text-[12px] text-text-tertiary">
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

      <section className="mt-5 rounded-lg border border-border bg-bg-surface p-5">
        <p className="text-[14px] font-bold">Recent reviews</p>
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

      <form
        action={providerDecisionAction}
        className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-bg-surface p-5"
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={row.id} />
        <fieldset>
          <legend className="text-[14px] font-bold">Action</legend>
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                { key: "approve", label: t("provApprove"), show: !isApproved },
                { key: "forceApprove", label: "Force approve (override — note required)", show: !isApproved },
                { key: "sendBack", label: t("provSendBack"), show: !isSuspended },
                { key: "hold", label: t("provHold"), show: !isSuspended },
                { key: "reject", label: t("provReject"), show: status !== "rejected" },
                { key: "suspend", label: "Suspend", show: isApproved },
                { key: "resume", label: "Resume", show: isSuspended },
              ] as const
            )
              .filter((a) => a.show)
              .map((a, i) => (
                <li key={a.key}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-border bg-bg-surface p-3 has-[:checked]:border-2 has-[:checked]:border-brand">
                    <input
                      type="radio"
                      name="action"
                      value={a.key}
                      required
                      defaultChecked={i === 0}
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
          <Label htmlFor="note">{t("disputeNote")}</Label>
          <textarea
            id="note"
            name="note"
            rows={3}
            className="block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface p-3 text-[14px] focus:border-brand focus:outline-none"
          />
        </div>

        <Button type="submit" variant="primary" block size="md">
          {t("disputeApply")}
        </Button>
      </form>
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <p className="text-[12px] text-text-tertiary">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold tabular-nums">{value}</p>
      {sub && (
        <p className="mt-0.5 text-[12px] text-text-tertiary tabular-nums">
          {sub}
        </p>
      )}
    </div>
  );
}
