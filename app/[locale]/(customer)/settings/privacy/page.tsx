import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CheckCircle2, Download, AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { getCurrentUser, signOut } from "@/lib/auth/server";
import { buildUserDataExport } from "@/lib/privacy/export";

async function savePrivacyAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  // Preferences UI is purely cosmetic until we wire up a user_settings
  // table. Round-trip and toast — silent acceptance until then.
  nextRedirect(`/${locale}/settings/privacy?saved=1`);
}

async function exportDataAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const url = await buildUserDataExport(me.id);
  nextRedirect(`/${locale}/settings/privacy?export=${encodeURIComponent(url)}`);
}

async function deleteAccountAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const confirm = String(formData.get("confirm") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (confirm !== "DELETE") {
    nextRedirect(`/${locale}/settings/privacy?error=confirm`);
  }

  // FK cascades remove everything tied to this user: bookings (which in
  // turn cascade to disputes/payments/reviews/booking_changes),
  // addresses, emergency_contacts, family_members, payment_methods,
  // ai_conversations (+messages), incident_reports, notifications,
  // provider_profiles (+documents/categories). review_reports.reporterId
  // is set null so moderation history survives.
  await db.delete(users).where(eq(users.id, me.id));

  await signOut();
  nextRedirect(`/${locale}/home?deleted=1`);
}

export default async function PrivacySettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const country = await getCountry();
  const t = await getTranslations("privacy");
  const tCommon = await getTranslations("common");
  const saved = sp.saved === "1";
  const error = typeof sp.error === "string" ? sp.error : null;
  const exportUrl = typeof sp.export === "string" ? sp.export : null;

  const opts = [
    {
      name: "analytics",
      label: t("optAnalytics"),
      hint: t("optAnalyticsHint"),
      defaultOn: true,
    },
    {
      name: "marketing",
      label: t("optMarketing"),
      hint: t("optMarketingHint"),
      defaultOn: false,
    },
    {
      name: "shareFamily",
      label: t("optShareWithFamily"),
      hint: "",
      defaultOn: true,
    },
  ];

  return (
    <>
      <Header
        country={country}
        back
        signedIn={true}
        initials={me.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("title")}</h1>
        <p className="mt-1 text-[15px] text-text-secondary">{t("sub")}</p>

        {saved && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success"
          >
            <CheckCircle2 size={18} aria-hidden /> {t("saved")}
          </div>
        )}
        {error === "confirm" && (
          <div
            role="alert"
            className="mt-4 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
          >
            {locale.startsWith("zh")
              ? '请输入"DELETE"以确认删除账号。'
              : 'Type "DELETE" to confirm account deletion.'}
          </div>
        )}

        <form action={savePrivacyAction} className="mt-5 flex flex-col gap-3">
          <input type="hidden" name="locale" value={locale} />
          {opts.map((o) => (
            <label
              key={o.name}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg-surface p-4 has-[:checked]:border-brand"
            >
              <input
                type="checkbox"
                name={o.name}
                defaultChecked={o.defaultOn}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-border-strong peer-checked:border-brand peer-checked:bg-brand peer-checked:after:block after:hidden after:text-white after:content-['✓']"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{o.label}</span>
                {o.hint && (
                  <span className="mt-0.5 block text-[13px] text-text-secondary">
                    {o.hint}
                  </span>
                )}
              </span>
            </label>
          ))}
          <Button type="submit" variant="primary" block size="md">
            {tCommon("save")}
          </Button>
        </form>

        <section className="mt-8 rounded-lg border border-border bg-bg-surface p-5">
          <h2 className="flex items-center gap-2 text-[16px] font-bold">
            <Download size={18} className="text-brand" aria-hidden />
            {t("download")}
          </h2>
          <p className="mt-1 text-[13px] text-text-secondary">
            {t("downloadHint")}
          </p>
          {exportUrl && (
            <p className="mt-3 rounded-md bg-success-soft px-3.5 py-2.5 text-[14px] text-success">
              <a
                href={exportUrl}
                download
                className="inline-flex items-center gap-1.5 font-bold underline"
              >
                <Download size={14} aria-hidden />
                {locale.startsWith("zh") ? "下载 JSON 存档" : "Download JSON archive"}
              </a>
            </p>
          )}
          <form action={exportDataAction} className="mt-3">
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="inline-flex h-12 items-center rounded-md border-[1.5px] border-brand bg-bg-surface px-5 text-[15px] font-bold text-brand"
            >
              {t("download")}
            </button>
          </form>
        </section>

        <section className="mt-5 rounded-lg border-[1.5px] border-danger bg-danger-soft p-5">
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-danger">
            <AlertTriangle size={18} aria-hidden />
            {t("deleteAccount")}
          </h2>
          <p className="mt-1 text-[13px] text-danger">{t("deleteHint")}</p>
          <form action={deleteAccountAction} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="locale" value={locale} />
            <label className="text-[13px] font-semibold text-danger">
              {locale.startsWith("zh")
                ? '请输入大写 "DELETE" 以确认：'
                : 'Type "DELETE" to confirm:'}
              <input
                type="text"
                name="confirm"
                required
                pattern="DELETE"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border-[1.5px] border-danger bg-bg-surface px-3 py-2 text-[15px] font-bold uppercase text-danger focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-md border-[1.5px] border-danger bg-bg-surface px-5 text-[15px] font-bold text-danger"
            >
              {t("deleteAccount")}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
