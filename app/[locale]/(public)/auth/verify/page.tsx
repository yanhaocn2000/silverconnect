import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Mail } from "lucide-react";
import { AuthCard } from "@/components/domain/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { issueCode, consumeCode } from "@/components/domain/verifyCode";
import { sendEmail, buildVerifyEmail } from "@/components/domain/email";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { findUserByEmail, signInUser } from "@/lib/auth/server";

async function resendAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const locale = String(formData.get("locale") ?? "en");
  if (!email.includes("@")) {
    nextRedirect(`/${locale}/auth/register`);
  }
  const user = await findUserByEmail(email);
  if (!user) nextRedirect(`/${locale}/auth/register`);
  const code = await issueCode(email, "email_verify");
  const { subject, text, html } = buildVerifyEmail(code, locale);
  after(async () => {
    const result = await sendEmail({ to: email, subject, text, html });
    if (!result.ok) {
       
      console.error("[resend] sendEmail failed:", result.reason);
    }
  });
  nextRedirect(
    `/${locale}/auth/verify?email=${encodeURIComponent(email)}&resent=1`,
  );
}

async function verifyCodeAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en");
  if (!email.includes("@") || !/^\d{6}$/.test(code)) {
    nextRedirect(
      `/${locale}/auth/verify?email=${encodeURIComponent(email)}&error=format`,
    );
  }
  const result = await consumeCode(email, code, "email_verify");
  if (!result.ok) {
    nextRedirect(
      `/${locale}/auth/verify?email=${encodeURIComponent(email)}&error=${result.reason}`,
    );
  }
  const user = await findUserByEmail(email);
  if (!user) {
    nextRedirect(`/${locale}/auth/register`);
  }
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await signInUser({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  nextRedirect(`/${locale}/auth/verify?state=success`);
}

type VerifyState = "pending" | "success" | "expired" | "resent";

function parseState(
  raw: string | undefined,
  resent: string | undefined,
  err: string | undefined,
): VerifyState {
  if (raw === "success") return "success";
  if (resent === "1") return "resent";
  if (err === "expired") return "expired";
  return "pending";
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const err = typeof sp.error === "string" ? sp.error : undefined;
  const state = parseState(
    typeof sp.state === "string" ? sp.state : undefined,
    typeof sp.resent === "string" ? sp.resent : undefined,
    err,
  );
  const emailParam =
    typeof sp.email === "string" && sp.email.length > 0 ? sp.email : null;
  if (!emailParam && sp.state !== "success") {
    nextRedirect(`/${locale}/auth/register`);
  }
  const email = emailParam ?? "";
  const errorMsg =
    err === "wrong"
      ? t("errorCodeWrong")
      : err === "missing"
      ? t("errorCodeMissing")
      : err === "throttled"
      ? t("errorCodeThrottled")
      : err === "format"
      ? t("errorCodeFormat")
      : err === "send"
      ? t("errorSendFailed")
      : null;

  if (state === "success") {
    return (
      <AuthCard title={t("verifySuccess")} subtitle={t("verifySuccessHint")} hideHero>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span
            aria-hidden
            className="flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-success"
          >
            <CheckCircle2 size={48} />
          </span>
          <Link
            href="/home"
            className="inline-flex h-14 w-full items-center justify-center rounded-md bg-brand text-[17px] font-bold text-white hover:bg-brand-hover"
          >
            {t("continueToHome")} →
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (state === "expired") {
    return (
      <AuthCard title={t("verifyExpired")} subtitle={t("verifyExpiredHint")}>
        <form action={resendAction} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="primary" block size="md">
            {t("verifyResend")}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={state === "resent" ? t("verifyResent") : t("verifyTitle")}
      subtitle={t("verifySub", { email })}
      hideHero
    >
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
        >
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span
          aria-hidden
          className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-brand"
        >
          <Mail size={42} />
        </span>
        <p className="text-[15px] font-semibold text-text-primary tabular-nums">
          {email}
        </p>
      </div>

      <form action={verifyCodeAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="locale" value={locale} />
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
            aria-describedby="code-hint"
            className="text-center text-[24px] tracking-[8px] tabular-nums"
          />
          <p id="code-hint" className="mt-1.5 text-[13px] text-text-tertiary">
            {t("verifyCodeHint")}
          </p>
        </div>
        <Button type="submit" variant="primary" block size="md">
          {t("verifyConfirm")}
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-2.5">
        <a
          href={`mailto:${email}`}
          className="inline-flex h-12 items-center justify-center rounded-md border-[1.5px] border-border-strong bg-bg-base text-[15px] font-semibold text-text-primary"
        >
          {t("openMailApp")}
        </a>
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-md text-[15px] font-semibold text-brand"
          >
            {t("verifyResend")}
          </button>
        </form>
      </div>
    </AuthCard>
  );
}
