import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound, redirect as nextRedirect } from "next/navigation";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { ChevronLeft, Check, ShieldAlert } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { getAdmin } from "@/components/domain/adminCookie";
import { db } from "@/lib/db";
import { incidentReports } from "@/lib/db/schema/safety";
import { users } from "@/lib/db/schema/users";
import { findUserByEmail } from "@/lib/auth/server";
import { notify } from "@/lib/notifications/server";

type UiAction = "warn" | "suspend" | "ban" | "police" | "close";

async function safetyDecisionAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "") as UiAction;
  const note = String(formData.get("note") ?? "").trim();
  const admin = await getAdmin();
  if (!admin.signedIn) nextRedirect(`/${locale}/admin/login`);

  const adminUser = admin.email ? await findUserByEmail(admin.email) : null;
  const adminId = adminUser?.id ?? null;

  const [r] = await db
    .select({ id: incidentReports.id, reporterUserId: incidentReports.userId })
    .from(incidentReports)
    .where(eq(incidentReports.id, id))
    .limit(1);
  if (!r) nextRedirect(`/${locale}/admin/safety?error=missing`);

  const actionLabels: Record<UiAction, string> = {
    warn: "Warning issued",
    suspend: "Suspended",
    ban: "Banned",
    police: "Escalated to police",
    close: "Closed without action",
  };
  await db
    .update(incidentReports)
    .set({
      reviewedAt: new Date(),
      reviewedBy: adminId,
      action: `${actionLabels[action]}${note ? ` — ${note}` : ""}`,
      updatedAt: new Date(),
    })
    .where(eq(incidentReports.id, id));

  after(async () => {
    if (!r.reporterUserId) return;
    await notify({
      userId: r.reporterUserId,
      kind: "safety",
      title: "Your safety report was reviewed",
      body: actionLabels[action] + (note ? ` — ${note}` : ""),
    });
  });

  nextRedirect(`/${locale}/admin/safety/${id}?applied=1`);
}

function categoryClass(c: string): string {
  switch (c) {
    case "harassment":
    case "accident":
      return "bg-danger-soft text-danger";
    case "theft":
    case "damage":
      return "bg-warning-soft text-warning";
    default:
      return "bg-bg-surface-2 text-text-secondary";
  }
}

export default async function AdminSafetyDetailPage({
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

  const [row] = await db
    .select({
      id: incidentReports.id,
      category: incidentReports.category,
      body: incidentReports.body,
      photos: incidentReports.photos,
      bookingId: incidentReports.bookingId,
      reporterUserId: incidentReports.userId,
      reviewedAt: incidentReports.reviewedAt,
      reviewedBy: incidentReports.reviewedBy,
      action: incidentReports.action,
      createdAt: incidentReports.createdAt,
    })
    .from(incidentReports)
    .where(eq(incidentReports.id, id))
    .limit(1);
  if (!row) notFound();

  const reporter = (
    await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, row.reporterUserId))
      .limit(1)
  )[0];
  const reviewer = row.reviewedBy
    ? (
        await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, row.reviewedBy))
          .limit(1)
      )[0]
    : null;

  const reviewed = row.reviewedAt !== null;
  const reporterName = reporter?.name || reporter?.email.split("@")[0] || "—";
  const reviewerName = reviewer?.name || reviewer?.email.split("@")[0] || null;

  return (
    <AdminShell email={admin.email ?? ""}>
      <Link
        href="/admin/safety"
        className="inline-flex h-10 items-center gap-1 text-[13px] font-semibold text-brand"
      >
        <ChevronLeft size={16} aria-hidden /> {t("safetyTitle")}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h2 tabular-nums">I-{row.id.slice(0, 8)}</h1>
        <span
          className={
            "inline-flex h-7 items-center gap-1 rounded-sm px-2.5 text-[12px] font-bold uppercase " +
            categoryClass(row.category)
          }
        >
          <ShieldAlert size={13} aria-hidden /> {row.category}
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

      <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[12px] text-text-tertiary">{t("colReporter")}</p>
          <p className="mt-0.5 text-[15px] font-bold">{reporterName}</p>
          {reporter && (
            <p className="text-[12px] text-text-tertiary">{reporter.email}</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[12px] text-text-tertiary">Booking</p>
          {row.bookingId ? (
            <Link
              href={`/admin/bookings?id=${row.bookingId}`}
              className="mt-0.5 block text-[15px] font-bold text-brand tabular-nums"
            >
              B-{row.bookingId.slice(0, 8)}
            </Link>
          ) : (
            <p className="mt-0.5 text-[15px] text-text-tertiary">—</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[12px] text-text-tertiary">{t("colSubmitted")}</p>
          <p className="mt-0.5 text-[14px] font-semibold tabular-nums">
            {row.createdAt.toLocaleString(
              locale === "en" ? "en-AU" : locale,
            )}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[12px] text-text-tertiary">{t("colStatus")}</p>
          {reviewed ? (
            <p className="mt-0.5 text-[14px] font-semibold text-success">
              Reviewed
              {reviewerName ? ` · ${reviewerName}` : ""}
            </p>
          ) : (
            <p className="mt-0.5 text-[14px] font-semibold text-warning">
              Open
            </p>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-border bg-bg-surface p-5">
        <p className="text-[14px] font-bold">{t("disputeTimeline")}</p>
        <p className="mt-2 whitespace-pre-line rounded-md border border-border bg-bg-surface-2 p-3 text-[14px]">
          {row.body}
        </p>
      </section>

      {row.photos && row.photos.length > 0 && (
        <section className="mt-5 rounded-lg border border-border bg-bg-surface p-5">
          <p className="text-[14px] font-bold">Photos</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {row.photos.map((url, i) => (
              <li
                key={i}
                className="overflow-hidden rounded-md border border-border bg-bg-surface-2"
              >
                {/* External user-uploaded URL; loaded as plain img to avoid
                    misuse of next/image's remotePatterns whitelist. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Evidence ${i + 1}`}
                  className="block aspect-square w-full object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!reviewed ? (
        <form
          action={safetyDecisionAction}
          className="mt-6 flex flex-col gap-4 rounded-lg border border-border bg-bg-surface p-5"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={row.id} />
          <fieldset>
            <legend className="text-[14px] font-bold">
              {t("safetyAction")}
            </legend>
            <ul className="mt-2 flex flex-col gap-2">
              {(
                [
                  { key: "warn", label: t("safetyWarn") },
                  { key: "suspend", label: t("safetySuspend") },
                  { key: "ban", label: t("safetyBan") },
                  { key: "police", label: t("safetyPolice") },
                  { key: "close", label: t("safetyClose") },
                ] as const
              ).map((a) => (
                <li key={a.key}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-border bg-bg-surface p-3 has-[:checked]:border-2 has-[:checked]:border-brand">
                    <input
                      type="radio"
                      name="action"
                      value={a.key}
                      required
                      defaultChecked={a.key === "warn"}
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
      ) : (
        <section className="mt-6 rounded-lg border border-border bg-success-soft p-5">
          <p className="text-[14px] font-bold text-success">
            {row.action || "Reviewed."}
          </p>
          {row.reviewedAt && (
            <p className="mt-1 text-[12px] text-text-tertiary tabular-nums">
              {row.reviewedAt.toLocaleString(
                locale === "en" ? "en-AU" : locale,
              )}
              {reviewerName ? ` · ${reviewerName}` : ""}
            </p>
          )}
        </section>
      )}
    </AdminShell>
  );
}
