import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { Link, redirect } from "@/i18n/navigation";
import { AuthCard } from "@/components/domain/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { issueCode } from "@/components/domain/verifyCode";
import { sendEmail, buildVerifyEmail } from "@/components/domain/email";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { findUserByEmail, getCurrentUser } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";

async function registerAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (!email.includes("@") || password.length < 8) {
    nextRedirect(`/${locale}/auth/register?error=invalid`);
  }

  const existing = await findUserByEmail(email);
  if (existing && existing.emailVerifiedAt) {
    nextRedirect(`/${locale}/auth/register?error=taken`);
  }

  const passwordHash = await hashPassword(password);
  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      email,
      passwordHash,
      role: "customer",
    });
  }

  // Issue code synchronously so verify page can already accept it; defer
  // the actual SMTP send to `after()` so the user isn't blocked on Gmail
  // SMTP latency (frequently 20-30s from CN). If send fails the user
  // can hit Resend on the verify page.
  const code = await issueCode(email, "email_verify");
  const { subject, text, html } = buildVerifyEmail(code, locale);
  after(async () => {
    const result = await sendEmail({ to: email, subject, text, html });
    if (!result.ok) {
       
      console.error("[register] sendEmail failed:", result.reason);
    }
  });
  nextRedirect(
    `/${locale}/auth/verify?email=${encodeURIComponent(email)}&sent=1`,
  );
}

export default async function RegisterPage({
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
    error === "taken"
      ? t("errorEmailTaken")
      : error === "smtp"
      ? t("errorSmtpUnconfigured")
      : error === "send"
      ? t("errorSendFailed")
      : error
      ? t("errorGeneric")
      : null;

  return (
    <AuthCard title={t("registerTitle")} subtitle={t("registerSub")}>
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
        >
          {errorMsg}
        </div>
      )}
      <form className="flex flex-col gap-4" action={registerAction}>
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
          <Label htmlFor="password">{tCommon("password")}</Label>
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
        <Button type="submit" variant="primary" block size="md">
          {t("registerCta")}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-[13px] text-text-tertiary">{tCommon("or")}</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <div className="flex flex-col gap-2.5">
        <a
          href={`/${locale}/auth/google/start?mode=register`}
          className="flex h-14 items-center justify-center gap-2 rounded-md border-[1.5px] border-border-strong bg-bg-surface text-[16px] font-semibold text-text-primary hover:bg-bg-surface-2"
        >
          <span aria-hidden>G</span>
          {t("google")}
        </a>
      </div>

      <p className="mt-6 text-center text-[15px] text-text-secondary">
        {t("hasAccount")}{" "}
        <Link href="/auth/login" className="font-semibold text-brand">
          {t("loginLink")}
        </Link>
      </p>
      <p className="mt-3 text-center text-[12px] text-text-tertiary">
        {t("termsAgree")}
      </p>
    </AuthCard>
  );
}
