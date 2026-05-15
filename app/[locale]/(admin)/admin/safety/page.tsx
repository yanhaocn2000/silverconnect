import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { after } from "next/server";
import { eq, desc, inArray, isNull, isNotNull } from "drizzle-orm";
import { X, Check, ShieldAlert } from "lucide-react";
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
type StatusFilter = "all" | "open" | "reviewed";

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

  // Notify the reporter that their report has been reviewed.
  after(async () => {
    if (!r.reporterUserId) return;
    await notify({
      userId: r.reporterUserId,
      kind: "safety",
      title: "Your safety report was reviewed",
      body: actionLabels[action] + (note ? ` — ${note}` : ""),
    });
  });

  nextRedirect(`/${locale}/admin/safety?applied=${id.slice(0, 8)}`);
}

const STATUS_OPTIONS = ["all", "open", "reviewed"] as const;

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

export default async function AdminSafetyPage({
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

  const drawerId = typeof sp.id === "string" ? sp.id : null;
  const applied = typeof sp.applied === "string" ? sp.applied : null;
  const rawStatus = typeof sp.status === "string" ? sp.status : "all";
  const fStatus: StatusFilter = (STATUS_OPTIONS as readonly string[]).includes(
    rawStatus,
  )
    ? (rawStatus as StatusFilter)
    : "all";

  const where =
    fStatus === "open"
      ? isNull(incidentReports.reviewedAt)
      : fStatus === "reviewed"
        ? isNotNull(incidentReports.reviewedAt)
        : undefined;

  const rows = await db
    .select({
      id: incidentReports.id,
      category: incidentReports.category,
      body: incidentReports.body,
      bookingId: incidentReports.bookingId,
      reviewedAt: incidentReports.reviewedAt,
      reviewedBy: incidentReports.reviewedBy,
      action: incidentReports.action,
      createdAt: incidentReports.createdAt,
      reporterUserId: incidentReports.userId,
    })
    .from(incidentReports)
    .where(where)
    .orderBy(desc(incidentReports.createdAt))
    .limit(100);

  // Batch-resolve reporter + reviewer user names.
  const userIds = Array.from(
    new Set(
      [
        ...rows.map((r) => r.reporterUserId),
        ...rows.map((r) => r.reviewedBy).filter(Boolean),
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

  return (
    <AdminShell email={admin.email ?? ""}>
      <h1 className="text-h2">{t("safetyTitle")}</h1>

      {applied && (
        <div
          role="status"
          className="mt-3 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-2.5 text-[14px] font-semibold text-success"
        >
          <Check size={16} aria-hidden /> {t("applied")} · {applied}
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
        {rows.length} {rows.length === 1 ? "report" : "reports"}
      </p>

      <div className="mt-2 overflow-hidden rounded-lg border border-border bg-bg-surface">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-text-tertiary">
            {t("emptySafety")}
          </p>
        ) : (
          <table className="w-full table-fixed text-left text-[13px]">
            <thead className="border-b border-border bg-bg-surface-2 text-text-secondary">
              <tr>
                <Th>{t("colId")}</Th>
                <Th>Category</Th>
                <Th>{t("colReporter")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th className="hidden md:table-cell">{t("colSubmitted")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const reviewed = r.reviewedAt !== null;
                return (
                  <tr
                    key={r.id}
                    className={
                      "border-b border-border last:border-b-0 " +
                      (drawerId === r.id ? "bg-brand-soft" : "")
                    }
                  >
                    <Td>
                      <Link
                        href={`?id=${r.id}`}
                        className="font-bold text-brand tabular-nums"
                      >
                        I-{r.id.slice(0, 8)}
                      </Link>
                    </Td>
                    <Td>
                      <span
                        className={
                          "inline-flex h-6 items-center gap-1 rounded-sm px-2 text-[11px] font-bold uppercase " +
                          categoryClass(r.category)
                        }
                      >
                        <ShieldAlert size={12} aria-hidden />
                        {r.category}
                      </span>
                    </Td>
                    <Td>{userMap.get(r.reporterUserId) ?? "—"}</Td>
                    <Td>
                      {reviewed ? (
                        <span className="inline-flex h-6 items-center rounded-sm bg-success-soft px-2 text-[11px] font-bold uppercase text-success">
                          reviewed
                        </span>
                      ) : (
                        <span className="inline-flex h-6 items-center rounded-sm bg-warning-soft px-2 text-[11px] font-bold uppercase text-warning">
                          open
                        </span>
                      )}
                    </Td>
                    <Td className="hidden md:table-cell tabular-nums text-text-tertiary">
                      {r.createdAt.toLocaleString(
                        locale === "en" ? "en-AU" : locale,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {drawerRow && (
        <SafetyDrawer
          row={drawerRow}
          reporterName={userMap.get(drawerRow.reporterUserId) ?? "—"}
          reviewerName={
            (drawerRow.reviewedBy && userMap.get(drawerRow.reviewedBy)) || null
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

function SafetyDrawer({
  row,
  reporterName,
  reviewerName,
  locale,
  t,
}: {
  row: {
    id: string;
    category: string;
    body: string;
    bookingId: string | null;
    reviewedAt: Date | null;
    action: string | null;
    createdAt: Date;
  };
  reporterName: string;
  reviewerName: string | null;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<"admin">>>;
}) {
  const reviewed = row.reviewedAt !== null;
  return (
    <>
      <Link
        href="/admin/safety"
        aria-label={t("drawerClose")}
        className="fixed inset-0 z-40 bg-black/30"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("safetyDrawer")}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col overflow-y-auto border-l border-border bg-bg-surface shadow-xl"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-border bg-bg-surface px-5 py-3">
          <p className="text-[16px] font-bold tabular-nums">
            I-{row.id.slice(0, 8)}
          </p>
          <Link
            href="/admin/safety"
            aria-label={t("drawerClose")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-bg-surface-2"
          >
            <X size={18} aria-hidden />
          </Link>
        </header>
        <div className="flex-1 px-5 py-5">
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[14px]">
            <dt className="font-semibold text-text-tertiary">
              {t("colReporter")}
            </dt>
            <dd>{reporterName}</dd>
            <dt className="font-semibold text-text-tertiary">Category</dt>
            <dd className="font-bold">{row.category}</dd>
            <dt className="font-semibold text-text-tertiary">Booking</dt>
            <dd className="tabular-nums">
              {row.bookingId ? row.bookingId.slice(0, 8) : "—"}
            </dd>
            <dt className="font-semibold text-text-tertiary">
              {t("colSubmitted")}
            </dt>
            <dd className="tabular-nums">
              {row.createdAt.toLocaleString(
                locale === "en" ? "en-AU" : locale,
              )}
            </dd>
            {reviewed && (
              <>
                <dt className="font-semibold text-text-tertiary">Reviewed</dt>
                <dd className="tabular-nums">
                  {row.reviewedAt!.toLocaleString(
                    locale === "en" ? "en-AU" : locale,
                  )}{" "}
                  {reviewerName ? `· ${reviewerName}` : ""}
                </dd>
              </>
            )}
          </dl>

          <p className="mt-4 text-[14px] font-bold">{t("disputeTimeline")}</p>
          <p className="mt-2 whitespace-pre-line rounded-md border border-border bg-bg-surface-2 p-3 text-[14px]">
            {row.body}
          </p>

          {reviewed ? (
            <p className="mt-6 rounded-md bg-success-soft px-3.5 py-3 text-[14px] font-semibold text-success">
              {row.action || "Reviewed."}
            </p>
          ) : (
            <form
              action={safetyDecisionAction}
              className="mt-6 flex flex-col gap-4 border-t border-border pt-5"
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
          )}
        </div>
      </aside>
    </>
  );
}
