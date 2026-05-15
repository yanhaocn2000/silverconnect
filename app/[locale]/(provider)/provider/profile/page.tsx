import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link, redirect } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";

async function saveProfile(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  nextRedirect(`/${locale}/provider/profile?saved=1`);
}

// Languages a provider can speak with customers — independent of the
// app's UI locale enum. BCP47 codes; uppercase fallback for languages
// without a localised label in messages/*.json.
const LANGS = ["en", "zh-CN", "zh-TW", "ja", "ko", "es", "ar", "vi"];

export default async function ProviderProfilePage({
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
  const t = await getTranslations("pProfile");
  const tCommon = await getTranslations("common");
  const tLanguage = await getTranslations("language");
  const saved = sp.saved === "1";
  const initials = session.initials ?? "?";

  return (
    <>
      <Header country={country} back signedIn={session.signedIn} initials={initials} />
      <main id="main-content" className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12">
        <h1 className="text-h2">{t("title")}</h1>

        {saved && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success">
            <CheckCircle2 size={18} aria-hidden /> {t("saved")}
          </div>
        )}

        <div className="mt-5 flex items-center gap-4 rounded-lg border border-border bg-bg-surface p-4">
          <ProviderAvatar size={72} hue={2} initials={initials} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">{session.name ?? "—"}</p>
            <Link href="/provider" className="mt-1 inline-flex h-9 items-center rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3 text-[12px] font-semibold text-text-primary">
              {t("preview")}
            </Link>
          </div>
        </div>

        <form action={saveProfile} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <div>
            <Label htmlFor="bio">{t("bio")}</Label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              aria-describedby="bio-hint"
              defaultValue=""
              className="block w-full rounded-md border-[1.5px] border-border-strong bg-bg-surface p-3.5 text-[16px] focus:border-brand focus:outline-none"
            />
            <p id="bio-hint" className="mt-1.5 text-[13px] text-text-tertiary">{t("bioHint")}</p>
          </div>

          <fieldset>
            <legend className="text-[15px] font-bold">{t("languages")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <label key={l} className="inline-flex h-10 cursor-pointer items-center rounded-pill border-[1.5px] border-border-strong bg-bg-surface px-4 text-[13px] font-semibold text-text-primary has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand">
                  <input type="checkbox" name="lang" value={l} defaultChecked={l === locale} className="sr-only" />
                  {l === "en" || l === "zh-CN" || l === "zh-TW" || l === "ja" || l === "ko"
                    ? tLanguage(l as "en" | "zh-CN" | "zh-TW" | "ja" | "ko")
                    : l.toUpperCase()}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="gender">{t("gender")}</Label>
            <select id="gender" name="gender" defaultValue="private" className="block h-touch-btn w-full rounded-md border-[1.5px] border-border bg-bg-surface px-4 text-body focus:border-brand focus:outline-none">
              <option value="private">{t("genderPrivate")}</option>
              <option value="f">F</option>
              <option value="m">M</option>
            </select>
          </div>

          <Button type="submit" variant="primary" block size="md">{tCommon("save")}</Button>
        </form>
      </main>
    </>
  );
}
