import { setRequestLocale, getTranslations } from "next-intl/server";
import { Repeat, Pause, Play, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link, redirect } from "@/i18n/navigation";
import { ProviderAvatar } from "@/components/domain/ProviderAvatar";
import { EmptyState } from "@/components/domain/PageStates";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";

interface Series {
  id: string;
  serviceKey: "cleaning" | "cooking" | "garden" | "personalCare" | "repair";
  providerName: string;
  providerInitials: string;
  cadence: "weekly" | "fortnightly" | "monthly";
  nextISO: string;
  paused: boolean;
}

const MOCK: Series[] = [
  {
    id: "S-201",
    serviceKey: "cleaning",
    providerName: "Helen Li",
    providerInitials: "HL",
    cadence: "weekly",
    nextISO: new Date(Date.now() + 86400000 * 3).toISOString(),
    paused: false,
  },
  {
    id: "S-202",
    serviceKey: "cooking",
    providerName: "Wei Tan",
    providerInitials: "WT",
    cadence: "fortnightly",
    nextISO: new Date(Date.now() + 86400000 * 9).toISOString(),
    paused: true,
  },
];

export default async function RecurringPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session.signedIn) redirect({ href: "/auth/login", locale });
  const country = await getCountry();
  const t = await getTranslations("recurring");
  const tCategories = await getTranslations("categories");

  const active = MOCK.filter((s) => !s.paused).length;
  const paused = MOCK.length - active;

  return (
    <>
      <Header country={country} back signedIn={session.signedIn} initials={session.initials} />
      <main id="main-content" className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12">
        <h1 className="text-h2">{t("title")}</h1>
        <p className="mt-1 text-[15px] text-text-secondary">{t("sub")}</p>

        {MOCK.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              illustration={Repeat as never}
              title={t("empty")}
              cta={
                <Link
                  href="/services"
                  className="inline-flex h-14 items-center rounded-md bg-brand px-7 text-[17px] font-bold text-white"
                >
                  {t("add")}
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <p className="mt-4 text-[13px] text-text-tertiary tabular-nums">
              {t("activeCount", { n: active })} · {t("pausedCount", { n: paused })}
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {MOCK.map((s) => {
                const next = new Date(s.nextISO).toLocaleDateString(
                  locale === "en" ? "en-AU" : locale,
                  { weekday: "short", month: "short", day: "numeric" }
                );
                return (
                  <li
                    key={s.id}
                    className={
                      "rounded-lg border bg-bg-surface p-4 " +
                      (s.paused ? "border-border" : "border-brand")
                    }
                  >
                    <div className="flex items-start gap-3">
                      <ProviderAvatar size={48} hue={2} initials={s.providerInitials} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold">
                          {tCategories(s.serviceKey)} · {s.providerName}
                        </p>
                        <p className="mt-0.5 text-[13px] font-semibold text-brand">
                          {t(s.cadence)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-text-tertiary tabular-nums">
                          {t("nextRun", { when: next })}
                        </p>
                      </div>
                      <span
                        className={
                          "inline-flex h-6 items-center rounded-sm px-2 text-[11px] font-bold uppercase tracking-wide " +
                          (s.paused
                            ? "bg-warning-soft text-warning"
                            : "bg-success-soft text-success")
                        }
                      >
                        {s.paused ? t("pause") : t("active")}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-10 items-center gap-1 rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3 text-[13px] font-semibold text-text-primary"
                      >
                        {s.paused ? <Play size={13} aria-hidden /> : <Pause size={13} aria-hidden />}
                        {s.paused ? t("resume") : t("pause")}
                      </button>
                      <button
                        type="button"
                        className="ml-auto inline-flex h-10 items-center gap-1 rounded-sm border-[1.5px] border-danger bg-bg-surface px-3 text-[13px] font-semibold text-danger"
                      >
                        <X size={13} aria-hidden />
                        {t("end")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/services"
              className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border-strong text-[16px] font-semibold text-brand"
            >
              {t("add")}
            </Link>
          </>
        )}
      </main>
    </>
  );
}
