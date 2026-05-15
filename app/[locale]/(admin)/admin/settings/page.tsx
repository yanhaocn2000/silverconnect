import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { redirect } from "@/i18n/navigation";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getAdmin } from "@/components/domain/adminCookie";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { adminSettings, auditLog } from "@/lib/db/schema/admin";
import { aiEmergencyKeywords } from "@/lib/db/schema/ai";
import { users } from "@/lib/db/schema/users";

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? "20");

const CANCEL_HOURS_KEY = "cancellation.window_hours";

async function saveSettings(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const cancelRaw = String(formData.get("cancelHours") ?? "");
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") nextRedirect(`/${locale}/admin/login`);

  const cancelHours = Number(cancelRaw);
  if (Number.isFinite(cancelHours) && cancelHours >= 0 && cancelHours <= 168) {
    const [existing] = await db
      .select({ id: adminSettings.id })
      .from(adminSettings)
      .where(eq(adminSettings.key, CANCEL_HOURS_KEY))
      .limit(1);
    if (existing) {
      await db
        .update(adminSettings)
        .set({
          value: cancelHours,
          updatedAt: new Date(),
          updatedBy: me.id,
        })
        .where(eq(adminSettings.id, existing.id));
    } else {
      await db.insert(adminSettings).values({
        key: CANCEL_HOURS_KEY,
        value: cancelHours,
        updatedBy: me.id,
      });
    }
  }

  await db.insert(auditLog).values({
    actorId: me.id,
    actorRole: "admin",
    action: "settings_save",
    targetType: "admin_settings",
    targetId: CANCEL_HOURS_KEY,
  });

  nextRedirect(`/${locale}/admin/settings?saved=1`);
}

export default async function AdminSettingsPage({
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
  const tA = await getTranslations("aSettings");
  const saved = sp.saved === "1";

  const [cancelRow] = await db
    .select({ value: adminSettings.value })
    .from(adminSettings)
    .where(eq(adminSettings.key, CANCEL_HOURS_KEY))
    .limit(1);
  const cancelHours = Number(cancelRow?.value ?? 24);

  const keywordRows = await db
    .select({ keyword: aiEmergencyKeywords.keyword, locale: aiEmergencyKeywords.locale })
    .from(aiEmergencyKeywords)
    .where(eq(aiEmergencyKeywords.enabled, true));
  const keywordsText = keywordRows.map((k) => k.keyword).join(", ");

  const adminUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(desc(users.createdAt))
    .limit(20);

  const recentAudit = await db
    .select({
      action: auditLog.action,
      actorId: auditLog.actorId,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(5);

  return (
    <AdminShell email={admin.email ?? ""}>
      <h1 className="text-h2">{tA("title")}</h1>

      {saved && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success"
        >
          <CheckCircle2 size={18} aria-hidden /> {tA("save")}
        </div>
      )}

      <form action={saveSettings} className="mt-5 flex flex-col gap-5">
        <input type="hidden" name="locale" value={locale} />

        <section className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[15px] font-bold">{tA("feeRates")}</p>
          <p className="mt-2 text-[13px] text-text-secondary">
            {PLATFORM_FEE_PERCENT}% — global rate set via{" "}
            <code className="rounded bg-bg-surface-2 px-1">
              PLATFORM_FEE_PERCENT
            </code>{" "}
            env var (Vercel dashboard).
          </p>
        </section>

        <section className="rounded-lg border border-border bg-bg-surface p-4">
          <Label htmlFor="cancelHours" className="text-[15px] font-bold">
            {tA("cancelWindow")}
          </Label>
          <div className="mt-3">
            <Input
              id="cancelHours"
              name="cancelHours"
              type="number"
              min={0}
              max={168}
              defaultValue={cancelHours}
              inputMode="numeric"
            />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-bg-surface p-4">
          <Label htmlFor="kw" className="text-[15px] font-bold">
            {tA("emergencyKw")}
          </Label>
          <textarea
            id="kw"
            name="kw"
            rows={3}
            aria-describedby="kw-hint"
            defaultValue={keywordsText}
            readOnly
            className="mt-3 block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface-2 p-3 text-[14px] text-text-secondary"
          />
          <p id="kw-hint" className="mt-1.5 text-[12px] text-text-tertiary">
            {tA("emergencyKwHint")} ({keywordRows.length} entries — managed
            via the <code>ai_emergency_keywords</code> table directly for
            now).
          </p>
        </section>

        <section className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[15px] font-bold">{tA("admins")}</p>
          {adminUsers.length === 0 ? (
            <p className="mt-3 text-[13px] text-text-tertiary">—</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-[13px]">
              {adminUsers.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-border bg-bg-surface px-3 py-2"
                >
                  <span>{a.email}</span>
                  <span className="rounded-sm bg-bg-surface-2 px-2 py-0.5 text-[11px] font-bold uppercase text-text-secondary">
                    {a.name ?? "Admin"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-bg-surface p-4">
          <p className="text-[15px] font-bold">{tA("auditLog")}</p>
          {recentAudit.length === 0 ? (
            <p className="mt-2 text-[13px] text-text-tertiary">—</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-[13px] text-text-tertiary">
              {recentAudit.map((a, i) => (
                <li key={i} className="tabular-nums">
                  {a.action} ·{" "}
                  {a.createdAt.toLocaleString(
                    locale === "en" ? "en-AU" : locale,
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <Button type="submit" variant="primary" block size="md">
          {tA("save")}
        </Button>
      </form>
    </AdminShell>
  );
}
