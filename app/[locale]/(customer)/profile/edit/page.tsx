import { setRequestLocale, getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { redirect } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";

export default async function ProfileEditPage({
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
  const t = await getTranslations("profileEdit");
  const saved = sp.saved === "1";
  const initials = session.initials ?? "?";

  return (
    <>
      <Header
        country={country}
        back
        signedIn={session.signedIn}
        initials={session.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("title")}</h1>

        {saved && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success"
          >
            <CheckCircle2 size={18} aria-hidden /> {t("saved")}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <ProviderAvatar size={96} hue={3} initials={initials} />
        </div>

        <form
          action="/profile/edit?saved=1"
          method="get"
          className="mt-6 flex flex-col gap-4"
        >
          <div>
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={session.name ?? ""}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue="margaret@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue="+61 412 000 111"
              autoComplete="tel"
              inputMode="tel"
            />
          </div>
          <div>
            <Label htmlFor="lang">{t("language")}</Label>
            <select
              id="lang"
              name="lang"
              defaultValue={locale}
              className="block h-touch-btn w-full rounded-md border-[1.5px] border-border bg-bg-surface px-4 text-body text-text-primary focus:border-brand focus:outline-none"
            >
              <option value="en">English</option>
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </div>
          <Button type="submit" variant="primary" block size="md">
            {t("save")}
          </Button>
        </form>
      </main>
    </>
  );
}
