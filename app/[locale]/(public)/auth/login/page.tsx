import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { Link, redirect } from "@/i18n/navigation";
import { AuthCard } from "@/components/domain/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { findUserByEmail, signInUser, getCurrentUser } from "@/lib/auth/server";
import { verifyPassword } from "@/lib/auth/password";

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (!email.includes("@") || password.length < 8) {
    nextRedirect(`/${locale}/auth/login?error=credentials`);
  }
  const user = await findUserByEmail(email);
  if (!user || user.deletedAt) {
    nextRedirect(`/${locale}/auth/login?error=credentials`);
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    nextRedirect(`/${locale}/auth/login?error=credentials`);
  }
  if (!user.emailVerifiedAt) {
    nextRedirect(
      `/${locale}/auth/verify?email=${encodeURIComponent(user.email)}&error=missing`,
    );
  }
  await signInUser(user);
  if (user.role === "admin") {
    nextRedirect(`/${locale}/admin`);
  }
  // Everyone else lands on the consumer home; the "provider mode" entry in
  // the nav takes them to /provider (which routes to onboarding if needed).
  nextRedirect(`/${locale}/home`);
}

export default async function LoginPage({
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
  if (me) redirect({ href: "/home", locale });
  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const errorMsg =
    error === "credentials"
      ? t("errorInvalidCreds")
      : error?.startsWith("google_")
      ? t("errorGoogleSignIn")
      : error
      ? t("errorGeneric")
      : null;
  return (
    <AuthCard title={t("loginTitle")} subtitle={t("loginSub")}>
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
        >
          {errorMsg}
        </div>
      )}
      <form className="flex flex-col gap-4" action={loginAction}>
        <input type="hidden" name="locale" value={locale} />
        <div>
          <Label htmlFor="email">{tCommon("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("emailPh")}
            required
          />
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <Label htmlFor="password" className="mb-0">
              {tCommon("password")}
            </Label>
            <Link
              href="/auth/forgot"
              className="text-[13px] font-semibold text-brand-ink hover:underline"
            >
              {t("forgot")}
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="mt-1.5 text-[14px] text-text-secondary">
            {t("passwordHint")}
          </p>
        </div>
        <Button type="submit" variant="primary" block size="md">
          {t("loginCta")}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-[13px] text-text-tertiary">{tCommon("or")}</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <div className="flex flex-col gap-2.5">
        <a
          href={`/${locale}/auth/google/start`}
          className="flex h-14 items-center justify-center gap-2 rounded-md border-[1.5px] border-border-strong bg-bg-surface text-[16px] font-semibold text-text-primary hover:bg-bg-surface-2"
        >
          <span aria-hidden>G</span>
          {t("google")}
        </a>
      </div>

      <p className="mt-6 text-center text-[15px] text-text-secondary">
        {t("noAccount")}{" "}
        <Link href="/auth/register" className="font-semibold text-brand">
          {t("registerLink")}
        </Link>
      </p>
      <p className="mt-3 text-center text-[12px] text-text-tertiary">
        {t("termsAgree")}
      </p>
    </AuthCard>
  );
}
