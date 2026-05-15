import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { redirect } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";

async function saveAccount(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  nextRedirect(`/${locale}/settings/account?saved=1`);
}

export default async function AccountSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session.signedIn) redirect({ href: "/auth/login", locale });
  const country = await getCountry();
  const t = await getTranslations("account");
  const tCommon = await getTranslations("common");
  const tCountry = await getTranslations("country");
  const saved = sp.saved === "1";

  const fieldClass = "block h-touch-btn w-full rounded-md border-[1.5px] border-border bg-bg-surface px-4 text-body text-text-primary focus:border-brand focus:outline-none";

  return (
    <>
      <Header country={country} back signedIn={session.signedIn} initials={session.initials} />
      <main id="main-content" className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12">
        <h1 className="text-h2">{t("title")}</h1>

        {saved && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success">
            <CheckCircle2 size={18} aria-hidden /> {t("saved")}
          </div>
        )}

        <form action={saveAccount} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <div>
            <Label htmlFor="lang">{t("language")}</Label>
            <select id="lang" name="lang" defaultValue={locale} className={fieldClass}>
              <option value="en">English</option>
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </div>
          <div>
            <Label htmlFor="region">{t("region")}</Label>
            <select id="region" name="region" defaultValue={country} className={fieldClass}>
              <option value="AU">{tCountry("AU")}</option>
              <option value="US">{tCountry("US")}</option>
              <option value="CA">{tCountry("CA")}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="tz">{t("timezone")}</Label>
            <select id="tz" name="tz" defaultValue="Australia/Sydney" className={fieldClass}>
              <option value="Australia/Sydney">Australia/Sydney</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Toronto">America/Toronto</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <Label htmlFor="ccy">{t("currency")}</Label>
            <select id="ccy" name="ccy" defaultValue={country === "US" ? "USD" : country === "CA" ? "CAD" : "AUD"} className={fieldClass}>
              <option value="AUD">AUD</option>
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
          <Button type="submit" variant="primary" block size="md">{tCommon("save")}</Button>
        </form>
      </main>
    </>
  );
}
