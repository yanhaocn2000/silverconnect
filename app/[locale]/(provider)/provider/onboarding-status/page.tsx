import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { Check, Loader2, Clock, AlertCircle, RotateCcw } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import {
  providerProfiles,
  providerDocuments,
  providerBackgroundChecks,
} from "@/lib/db/schema/providers";
import { users } from "@/lib/db/schema/users";
import { getCurrentUser } from "@/lib/auth/server";
import { requiredDocTypes, requiresAbn } from "@/lib/compliance/country";
import { retryBackgroundCheck } from "@/lib/provider/backgroundCheck";

type StepState = "done" | "inProgress" | "waiting" | "action";

async function retryBgCheckAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const [p] = await db
    .select({ id: providerProfiles.id })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, me.id))
    .limit(1);
  if (!p) nextRedirect(`/${locale}/provider/register`);
  await retryBackgroundCheck(p.id);
  nextRedirect(`/${locale}/provider/onboarding-status`);
}

function fmtWhen(d: Date, locale: string): string {
  return d.toLocaleDateString(locale === "en" ? "en-AU" : locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OnboardingStatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const country = await getCountry();
  const t = await getTranslations("provider");
  const tCommon = await getTranslations("common");

  const [profile] = await db
    .select({
      id: providerProfiles.id,
      onboardingStatus: providerProfiles.onboardingStatus,
      submittedAt: providerProfiles.submittedAt,
      stripeAccountId: providerProfiles.stripeAccountId,
      abnActive: providerProfiles.abnActive,
      userCountry: users.country,
    })
    .from(providerProfiles)
    .leftJoin(users, eq(users.id, providerProfiles.userId))
    .where(eq(providerProfiles.userId, me.id))
    .limit(1);
  if (!profile) nextRedirect(`/${locale}/provider/register`);

  const need = requiredDocTypes(profile.userCountry);
  const [docs, bgRows] = await Promise.all([
    need.length > 0
      ? db
          .select({
            type: providerDocuments.type,
            status: providerDocuments.status,
            expiresAt: providerDocuments.expiresAt,
          })
          .from(providerDocuments)
          .where(
            and(
              eq(providerDocuments.providerId, profile.id),
              inArray(providerDocuments.type, need),
            ),
          )
      : Promise.resolve(
          [] as { type: string; status: string; expiresAt: Date | null }[],
        ),
    db
      .select({
        status: providerBackgroundChecks.status,
        requestedAt: providerBackgroundChecks.requestedAt,
        clearedAt: providerBackgroundChecks.clearedAt,
      })
      .from(providerBackgroundChecks)
      .where(
        and(
          eq(providerBackgroundChecks.providerId, profile.id),
          eq(providerBackgroundChecks.isCurrent, true),
        ),
      )
      .limit(1),
  ]);
  const bg = bgRows[0] ?? null;
  const now = new Date().getTime();
  const docByType = new Map(docs.map((d) => [d.type, d]));
  const allDocsOk =
    need.length === 0 ||
    need.every((tp) => {
      const d = docByType.get(tp);
      return (
        d && d.status === "approved" && (!d.expiresAt || d.expiresAt.getTime() > now)
      );
    });
  const anyDocRejected = docs.some((d) => d.status === "rejected");
  const approved = profile.onboardingStatus === "approved";
  const needsAbn = requiresAbn(profile.userCountry);
  const abnOk = !needsAbn || profile.abnActive === true;

  const stepRows: {
    key: string;
    label: string;
    state: StepState;
    when?: string;
    action?: React.ReactNode;
  }[] = [];

  stepRows.push({
    key: "obSubmitted",
    label: t("obSubmitted"),
    state: profile.submittedAt ? "done" : "inProgress",
    when: profile.submittedAt ? fmtWhen(profile.submittedAt, locale) : undefined,
  });

  if (needsAbn) {
    stepRows.push({
      key: "obAbn",
      label: t("obAbn"),
      state: abnOk ? "done" : "action",
      action: abnOk ? undefined : (
        <CtaLink href="/provider/register?step=1" label={t("rAbn")} />
      ),
    });
  }

  stepRows.push({
    key: "obDocs",
    label: t("obDocs"),
    state: allDocsOk
      ? "done"
      : anyDocRejected
        ? "action"
        : docs.length > 0
          ? "inProgress"
          : "action",
    action: allDocsOk ? undefined : (
      <CtaLink href="/provider/compliance" label={t("docUpload")} />
    ),
  });

  stepRows.push({
    key: "obBackground",
    label: t("obBackground"),
    state: !bg
      ? "waiting"
      : bg.status === "cleared"
        ? "done"
        : bg.status === "failed" || bg.status === "expired"
          ? "action"
          : "inProgress",
    when: bg?.clearedAt
      ? fmtWhen(bg.clearedAt, locale)
      : bg?.requestedAt
        ? fmtWhen(bg.requestedAt, locale)
        : undefined,
    action:
      bg && (bg.status === "failed" || bg.status === "expired") ? (
        <form action={retryBgCheckAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-1.5 rounded-md border-[1.5px] border-brand bg-bg-surface px-4 text-[14px] font-bold text-brand"
          >
            <RotateCcw size={14} aria-hidden /> {tCommon("retry")}
          </button>
        </form>
      ) : undefined,
  });

  stepRows.push({
    key: "obStripe",
    label: t("obStripe"),
    state: approved ? "done" : profile.stripeAccountId ? "inProgress" : "action",
    action: approved ? undefined : (
      <CtaLink
        href="/provider/register?step=5"
        label={profile.stripeAccountId ? t("stripeContinue") : t("stripeConnect")}
      />
    ),
  });

  stepRows.push({
    key: "obLive",
    label: t("obLive"),
    state: approved ? "done" : "waiting",
  });

  return (
    <>
      <Header country={country} back signedIn={true} initials={me.initials} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-12 pt-6"
      >
        <h1 className="text-h2">{t("onboardingTitle")}</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          {t("onboardingSub")}
        </p>

        <ol className="mt-6 flex flex-col">
          {stepRows.map((s, i) => (
            <StepRow
              key={s.key}
              state={s.state}
              last={i === stepRows.length - 1}
              label={s.label}
              stateLabel={t(
                s.state === "done"
                  ? "obDone"
                  : s.state === "inProgress"
                    ? "obInProgress"
                    : s.state === "waiting"
                      ? "obWaiting"
                      : "obAction",
              )}
              when={s.when}
              action={s.action}
            />
          ))}
        </ol>
      </main>
    </>
  );
}

function CtaLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center rounded-md border-[1.5px] border-brand bg-bg-surface px-4 text-[14px] font-bold text-brand"
    >
      {label}
    </Link>
  );
}

function StepRow({
  state,
  last,
  label,
  stateLabel,
  when,
  action,
}: {
  state: StepState;
  last: boolean;
  label: string;
  stateLabel: string;
  when?: string;
  action?: React.ReactNode;
}) {
  const Icon =
    state === "done"
      ? Check
      : state === "inProgress"
        ? Loader2
        : state === "action"
          ? AlertCircle
          : Clock;
  const colorClass =
    state === "done"
      ? "bg-success-soft text-success"
      : state === "inProgress"
        ? "bg-brand-soft text-brand"
        : state === "action"
          ? "bg-warning-soft text-warning"
          : "bg-bg-surface-2 text-text-tertiary";
  return (
    <li className="grid grid-cols-[40px_1fr] gap-3">
      <div className="flex flex-col items-center">
        <span
          aria-hidden
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
            colorClass
          }
        >
          <Icon
            size={20}
            className={state === "inProgress" ? "animate-spin" : undefined}
          />
        </span>
        {!last && <span aria-hidden className="my-1 w-px flex-1 bg-border" />}
      </div>
      <div className="pb-6">
        <p className="text-[16px] font-bold text-text-primary">{label}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-text-secondary">
          {stateLabel}
          {when && (
            <span className="ml-2 font-normal text-text-tertiary">· {when}</span>
          )}
        </p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </li>
  );
}
