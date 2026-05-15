import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { after } from "next/server";
import { eq, desc } from "drizzle-orm";
import { X, Check } from "lucide-react";
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
} from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { findUserByEmail } from "@/lib/auth/server";
import { notify } from "@/lib/notifications/server";

type DbStatus =
  | "pending"
  | "docs_review"
  | "approved"
  | "rejected"
  | "suspended";
type UiAction = "approve" | "sendBack" | "hold" | "reject";

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

  const patches: Record<UiAction, Partial<{
    onboardingStatus: DbStatus;
    approvedAt: Date | null;
    rejectedAt: Date | null;
    rejectionReason: string | null;
  }>> = {
    approve: {
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
  };
  const patch = patches[action];
  if (!patch) nextRedirect(`/${locale}/admin/providers?id=${id}&error=invalid`);

  const [row] = await db
    .select({ id: providerProfiles.id, userId: providerProfiles.userId })
    .from(providerProfiles)
    .where(eq(providerProfiles.id, id))
    .limit(1);
  if (!row) nextRedirect(`/${locale}/admin/providers?error=missing`);

  await db
    .update(providerProfiles)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(providerProfiles.id, id));

  // Notify the provider's user.
  after(async () => {
    if (!row.userId) return;
    const titles: Record<UiAction, string> = {
      approve: "Your provider application is approved",
      sendBack: "Action needed on your provider application",
      hold: "Your provider application is on hold",
      reject: "Your provider application was declined",
    };
    await notify({
      userId: row.userId,
      kind: "system",
      title: titles[action],
      body: note || undefined,
      link: `/${locale}/provider/onboarding-status`,
    });
  });

  // (admin actor recorded via adminUser?.id is captured by future
  // admin_actions hook — not wired in this wave.)
  void adminUser;

  nextRedirect(`/${locale}/admin/providers?applied=${id.slice(0, 8)}`);
}

const STATUS_FILTER_OPTIONS = [
  "all",
  "pending",
  "docs_review",
  "approved",
  "rejected",
  "suspended",
] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];

export default async function AdminProvidersPage({
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
  const fStatus: StatusFilter = (STATUS_FILTER_OPTIONS as readonly string[]).includes(
    rawStatus,
  )
    ? (rawStatus as StatusFilter)
    : "all";

  const where =
    fStatus === "all"
      ? undefined
      : eq(providerProfiles.onboardingStatus, fStatus as DbStatus);

  const rows = await db
    .select({
      id: providerProfiles.id,
      onboardingStatus: providerProfiles.onboardingStatus,
      addressLine: providerProfiles.addressLine,
      submittedAt: providerProfiles.submittedAt,
      createdAt: providerProfiles.createdAt,
      bio: providerProfiles.bio,
      providerName: users.name,
      providerEmail: users.email,
      providerCountry: users.country,
    })
    .from(providerProfiles)
    .leftJoin(users, eq(users.id, providerProfiles.userId))
    .where(where)
    .orderBy(desc(providerProfiles.createdAt))
    .limit(100);

  const drawerRow = drawerId ? rows.find((r) => r.id === drawerId) : null;
  let drawerDocs: { type: string; status: string }[] = [];
  let drawerCats: string[] = [];
  if (drawerRow) {
    const [docs, cats] = await Promise.all([
      db
        .select({
          type: providerDocuments.type,
          status: providerDocuments.status,
        })
        .from(providerDocuments)
        .where(eq(providerDocuments.providerId, drawerRow.id)),
      db
        .select({ category: providerCategories.category })
        .from(providerCategories)
        .where(eq(providerCategories.providerId, drawerRow.id)),
    ]);
    drawerDocs = docs;
    drawerCats = cats.map((c) => c.category as string);
  }

  return (
    <AdminShell email={admin.email ?? ""}>
      <h1 className="text-h2">{t("providersTitle")}</h1>

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
            {STATUS_FILTER_OPTIONS.map((s) => (
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
        {rows.length} {rows.length === 1 ? "provider" : "providers"}
      </p>

      <div className="mt-2 overflow-hidden rounded-lg border border-border bg-bg-surface">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-[14px] text-text-tertiary">
            No providers
          </p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-bg-surface-2 text-text-secondary">
              <tr>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {t("colProvider")}
                </th>
                <th className="hidden px-4 py-3 text-[12px] font-semibold uppercase tracking-wide md:table-cell">
                  {t("colCountry")}
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {t("colAppliedAt")}
                </th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide">
                  {t("colStatus")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const dispName =
                  p.providerName || (p.providerEmail?.split("@")[0] ?? "—");
                const initials = initialsOf(p.providerName, p.providerEmail ?? "?");
                const status = p.onboardingStatus as DbStatus;
                const appliedDate = (p.submittedAt ?? p.createdAt).toLocaleDateString(
                  locale === "en" ? "en-AU" : locale,
                  { month: "short", day: "numeric" },
                );
                return (
                  <tr
                    key={p.id}
                    className={
                      "border-b border-border last:border-b-0 " +
                      (drawerId === p.id ? "bg-brand-soft" : "")
                    }
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`?id=${p.id}`}
                        className="flex items-center gap-3"
                      >
                        <ProviderAvatar size={36} hue={2} initials={initials} />
                        <span className="min-w-0">
                          <span className="block font-bold text-brand">
                            {dispName}
                          </span>
                          <span className="block text-[12px] text-text-tertiary tabular-nums">
                            {p.id.slice(0, 8)}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {p.providerCountry ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-tertiary">
                      {appliedDate}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex h-6 items-center rounded-sm px-2 text-[11px] font-bold uppercase tracking-wide " +
                          statusBadgeClass(status)
                        }
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {drawerRow && (
        <ApproveDrawer
          row={drawerRow}
          docs={drawerDocs}
          cats={drawerCats}
          locale={locale}
          t={t}
        />
      )}
    </AdminShell>
  );
}

function ApproveDrawer({
  row,
  docs,
  cats,
  locale,
  t,
}: {
  row: {
    id: string;
    onboardingStatus: string;
    addressLine: string | null;
    submittedAt: Date | null;
    createdAt: Date;
    bio: string | null;
    providerName: string | null;
    providerEmail: string | null;
    providerCountry: string | null;
  };
  docs: { type: string; status: string }[];
  cats: string[];
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<"admin">>>;
}) {
  const dispName =
    row.providerName || (row.providerEmail?.split("@")[0] ?? "Provider");
  const decided =
    row.onboardingStatus === "approved" ||
    row.onboardingStatus === "rejected" ||
    row.onboardingStatus === "suspended";
  return (
    <>
      <Link
        href="/admin/providers"
        aria-label={t("drawerClose")}
        className="fixed inset-0 z-40 bg-black/30"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("providerDrawer")}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col overflow-y-auto border-l border-border bg-bg-surface shadow-xl"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-border bg-bg-surface px-5 py-3">
          <p className="text-[16px] font-bold">{dispName}</p>
          <Link
            href="/admin/providers"
            aria-label={t("drawerClose")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-bg-surface-2"
          >
            <X size={18} aria-hidden />
          </Link>
        </header>
        <div className="flex-1 px-5 py-5">
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[14px]">
            <dt className="font-semibold text-text-tertiary">Email</dt>
            <dd className="break-all">{row.providerEmail ?? "—"}</dd>
            <dt className="font-semibold text-text-tertiary">
              {t("colCountry")}
            </dt>
            <dd>{row.providerCountry ?? "—"}</dd>
            <dt className="font-semibold text-text-tertiary">
              {t("colAppliedAt")}
            </dt>
            <dd className="tabular-nums">
              {(row.submittedAt ?? row.createdAt).toLocaleString(
                locale === "en" ? "en-AU" : locale,
              )}
            </dd>
            <dt className="font-semibold text-text-tertiary">
              {t("colStatus")}
            </dt>
            <dd className="font-bold">{row.onboardingStatus}</dd>
            <dt className="font-semibold text-text-tertiary">Address</dt>
            <dd>{row.addressLine ?? "—"}</dd>
            <dt className="font-semibold text-text-tertiary">Categories</dt>
            <dd>{cats.length ? cats.join(", ") : "—"}</dd>
          </dl>

          {row.bio && (
            <>
              <p className="mt-5 text-[14px] font-bold">Bio</p>
              <p className="mt-1 whitespace-pre-line rounded-md border border-border bg-bg-surface-2 p-3 text-[14px] text-text-primary">
                {row.bio}
              </p>
            </>
          )}

          <p className="mt-5 text-[14px] font-bold">{t("providerStepCheck")}</p>
          {docs.length === 0 ? (
            <p className="mt-2 text-[13px] text-text-tertiary">
              No documents uploaded yet.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {docs.map((d) => (
                <li
                  key={d.type}
                  className="flex items-center justify-between rounded-md border border-border bg-bg-surface px-3 py-2 text-[13px]"
                >
                  <span>{d.type}</span>
                  <span
                    className={
                      "inline-flex h-5 items-center rounded-sm px-2 text-[11px] font-bold uppercase " +
                      (d.status === "approved"
                        ? "bg-success-soft text-success"
                        : d.status === "rejected"
                          ? "bg-danger-soft text-danger"
                          : "bg-warning-soft text-warning")
                    }
                  >
                    {d.status}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {decided ? (
            <p className="mt-6 rounded-md bg-bg-surface-2 px-3.5 py-3 text-[14px] font-semibold text-text-secondary">
              Decision already recorded.
            </p>
          ) : (
            <form
              action={providerDecisionAction}
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
                      { key: "approve", label: t("providerApprove") },
                      { key: "sendBack", label: t("providerSendBack") },
                      { key: "hold", label: t("providerHold") },
                      { key: "reject", label: t("providerReject") },
                    ] as const
                  ).map((a) => (
                    <li key={a.key}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-border bg-bg-surface p-3 has-[:checked]:border-2 has-[:checked]:border-brand">
                        <input
                          type="radio"
                          name="action"
                          value={a.key}
                          required
                          defaultChecked={a.key === "approve"}
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
                  aria-describedby="note-hint"
                  className="block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface p-3 text-[14px] focus:border-brand focus:outline-none"
                />
                <p
                  id="note-hint"
                  className="mt-1.5 text-[12px] text-text-tertiary"
                >
                  {t("providerNoteHint")}
                </p>
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
