import { setRequestLocale, getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { redirect } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";

const CHANNELS = [
  { key: "channelEmail", name: "email", defaultOn: true },
  { key: "channelSms", name: "sms", defaultOn: true },
  { key: "channelPush", name: "push", defaultOn: false },
] as const;

const TOPICS = [
  { key: "topicBookings", hintKey: "topicBookingsHint", name: "bookings", defaultOn: true },
  { key: "topicReminders", hintKey: "topicRemindersHint", name: "reminders", defaultOn: true },
  { key: "topicPayments", hintKey: "topicPaymentsHint", name: "payments", defaultOn: true },
  { key: "topicMarketing", hintKey: "topicMarketingHint", name: "marketing", defaultOn: false },
] as const;

export default async function NotifPrefsPage({
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
  const t = await getTranslations("notifPrefs");
  const saved = sp.saved === "1";

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

        <form action="/profile/notifications?saved=1" method="get" className="mt-6 flex flex-col gap-6">
          <fieldset>
            <legend className="text-[18px] font-bold">{t("channels")}</legend>
            <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-bg-surface">
              {CHANNELS.map((c, i) => (
                <li
                  key={c.name}
                  className={
                    i > 0
                      ? "flex items-center justify-between gap-3 border-t border-border px-4 py-3"
                      : "flex items-center justify-between gap-3 px-4 py-3"
                  }
                >
                  <span className="text-[16px] font-semibold">{t(c.key)}</span>
                  <Switch name={`channel_${c.name}`} defaultChecked={c.defaultOn} />
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset>
            <legend className="text-[18px] font-bold">{t("topics")}</legend>
            <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-bg-surface">
              {TOPICS.map((c, i) => (
                <li
                  key={c.name}
                  className={
                    i > 0
                      ? "flex items-start justify-between gap-3 border-t border-border px-4 py-3"
                      : "flex items-start justify-between gap-3 px-4 py-3"
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold">{t(c.key)}</p>
                    <p className="mt-0.5 text-[13px] text-text-secondary">{t(c.hintKey)}</p>
                  </div>
                  <Switch name={`topic_${c.name}`} defaultChecked={c.defaultOn} />
                </li>
              ))}
            </ul>
          </fieldset>

          <Button type="submit" variant="primary" block size="md">
            {t("save")}
          </Button>
        </form>
      </main>
    </>
  );
}
