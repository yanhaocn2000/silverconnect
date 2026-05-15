import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Link, redirect } from "@/i18n/navigation";
import { CheckCircle2 } from "lucide-react";
import { AuthCard } from "@/components/domain/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { consumeCode } from "@/components/domain/verifyCode";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { findUserByEmail, getCurrentUser } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";

async function resetAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (password.length < 8 || password !== confirm) {
    nextRedirect(
      `/${locale}/auth/reset?email=${encodeURIComponent(email)}&error=mismatch`,
    );
  }
  if (!email.includes("@") || !/^\d{6}$/.test(code)) {
    nextRedirect(
      `/${locale}/auth/reset?email=${encodeURIComponent(email)}&error=format`,
    );
  }
  const verify = await consumeCode(email, code, "password_reset");
  if (!verify.ok) {
    nextRedirect(
      `/${locale}/auth/reset?email=${encodeURIComponent(email)}&error=${verify.reason}`,
    );
  }
  const user = await findUserByEmail(email);
  if (!user) {
    nextRedirect(`/${locale}/auth/forgot?error=invalid`);
  }
  const passwordHash = await hashPassword(password);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  nextRedirect(`/${locale}/auth/reset?state=success`);
}

type ResetState = "default" | "success" | "expired";

function parseState(raw: string | undefined): ResetState {
  if (raw === "success") return "success";
  if (raw === "expired") return "expired";
  return "default";
}

export default async function ResetPasswordPage({
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
  const state = parseState(
    typeof sp.state === "string" ? sp.state : undefined,
  );
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const errorMsg =
    error === "mismatch"
      ? t("errorPasswordMismatch")
      : error === "format"
      ? t("errorCodeFormat")
      : error === "wrong"
      ? t("errorCodeWrong")
      : error === "missing"
      ? t("errorCodeMissing")
      : error === "expired"
      ? t("errorCodeExpired")
      : error === "throttled"
      ? t("errorCodeThrottled")
      : error
      ? t("errorGeneric")
      : null;
  const email =
    typeof sp.email === "string" && sp.email.includes("@") ? sp.email : "";
  const justSentNotice = sp.sent === "1" && state === "default";

  if (state === "success") {
    return (
      <AuthCard title={t("resetSuccess")} subtitle={t("resetSuccessHint")} hideHero>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 size={48} aria-hidden />
          </span>
          <Link
            href="/auth/login"
            className="inline-flex h-14 w-full items-center justify-center rounded-md bg-brand text-[17px] font-bold text-white hover:bg-brand-hover"
          >
            {t("backToLogin")}
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (state === "expired") {
    return (
      <AuthCard title={t("resetExpired")} subtitle={t("resetExpiredHint")}>
        <Link
          href="/auth/forgot"
          className="inline-flex h-14 w-full items-center justify-center rounded-md bg-brand text-[17px] font-bold text-white hover:bg-brand-hover"
        >
          {t("forgotCta")}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("resetTitle")} subtitle={t("resetSub")}>
      {justSentNotice && !errorMsg && (
        <div
          role="status"
          className="mb-4 rounded-md border-[1.5px] border-success bg-success-soft px-3.5 py-3 text-[14px] font-semibold text-success"
        >
          {t("forgotSentHint")}
        </div>
      )}
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
        >
          {errorMsg}
        </div>
      )}
      <form className="flex flex-col gap-4" action={resetAction}>
        <input type="hidden" name="locale" value={locale} />
        <div>
          <Label htmlFor="email">{tCommon("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            defaultValue={email}
            required
          />
        </div>
        <div>
          <Label htmlFor="code">{t("verifyCodeLabel")}</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            className="tabular-nums tracking-[6px] text-center text-[20px]"
          />
        </div>
        <div>
          <Label htmlFor="password">{t("newPassword")}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="mt-1.5 text-[14px] text-text-secondary">
            {t("passwordHint")}
          </p>
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
          {t("resetCta")}
        </Button>
      </form>
      <Link
        href="/auth/login"
        className="mt-4 inline-flex h-12 w-full items-center justify-center text-[15px] font-semibold text-brand"
      >
        {tCommon("back")}
      </Link>
    </AuthCard>
  );
}
