import { setRequestLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import { redirect as nextRedirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { redirect } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";

async function changePassword(formData: FormData) {
  "use server";
  const next = String(formData.get("new") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (next !== confirm) {
    nextRedirect(`/${locale}/profile/security?error=mismatch`);
  }
  // Demo: pretend the password changed. A real impl would hit Supabase
  // Auth via @/lib/auth and re-issue a session.
  nextRedirect(`/${locale}/profile/security?saved=1`);
}

export default async function ProfileSecurityPage({
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
  const t = await getTranslations("profileSecurity");
  const saved = sp.saved === "1";
  const error =
    sp.error === "mismatch"
      ? t("errorMismatch")
      : sp.error === "wrong"
      ? t("errorWrongCurrent")
      : null;

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
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
          >
            {error}
          </div>
        )}

        {/* Change password */}
        <section className="mt-6">
          <h2 className="text-[18px] font-bold">{t("passwordSection")}</h2>
          <form action={changePassword} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="locale" value={locale} />
            <div>
              <Label htmlFor="current">{t("currentPassword")}</Label>
              <Input
                id="current"
                name="current"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <Label htmlFor="new">{t("newPassword")}</Label>
              <Input
                id="new"
                name="new"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm">{t("confirmPassword")}</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" variant="primary" block size="md">
              {t("save")}
            </Button>
          </form>
        </section>

        {/* 2FA */}
        <section className="mt-8 flex items-start gap-4 rounded-lg border border-border bg-bg-surface p-4">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
          >
            <ShieldCheck size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold">{t("twoFactor")}</h2>
            <p className="mt-1 text-[14px] text-text-secondary">
              {t("twoFactorHint")}
            </p>
            <button
              type="button"
              className="mt-3 inline-flex h-12 items-center rounded-md border-2 border-brand bg-bg-surface px-5 text-[15px] font-bold text-brand"
            >
              {t("twoFactorEnable")}
            </button>
          </div>
        </section>

        {/* Sessions */}
        <section className="mt-6">
          <h2 className="text-[18px] font-bold">{t("sessions")}</h2>
          <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-bg-surface">
            <li className="flex items-center gap-3 px-4 py-3.5">
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-md bg-success-soft text-success"
              >
                <Smartphone size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">{t("sessionThis")}</p>
                <p className="text-[13px] text-text-tertiary">
                  {t("sessionLastActive", { time: locale.startsWith("zh") ? "刚刚" : "now" })}
                </p>
              </div>
            </li>
          </ul>
          <form action={`/${locale}/auth/logout`} method="POST">
            <button
              type="submit"
              className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-md border-[1.5px] border-danger bg-bg-surface text-[15px] font-bold text-danger"
            >
              {t("signOutAll")}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
