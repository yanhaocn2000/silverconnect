import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

// Reads campaign + progress at request time; the 60s in-memory cache lives
// in lib/donations/repository.ts, no need to pre-render.
export const dynamic = "force-dynamic";
import { Header } from "@/components/layout/Header";
import { ProgressCard } from "@/components/donate/ProgressCard";
import { ImpactStats } from "@/components/donate/ImpactStats";
import { Stories } from "@/components/donate/Stories";
import { AllocationDonut } from "@/components/donate/AllocationDonut";
import { DonateForm } from "@/components/donate/DonateForm";
import {
  getActiveCampaign,
  getCampaignProgress,
} from "@/lib/donations/repository";
import { SUPPORTED_LOCALES, type DonateLocale } from "@/lib/donations/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("donate.meta");
  return { title: t("title"), description: t("desc") };
}

export default async function DonatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) notFound();

  const t = await getTranslations("donate.hero");
  const campaign = await getActiveCampaign();
  if (!campaign) notFound();
  const progress = await getCampaignProgress(campaign.id);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(24, 88, 196, 0.10), transparent 60%), var(--bg-surface)",
          }}
        >
          <div className="max-w-6xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-surface border border-border text-sm text-text-secondary shadow-sm mb-5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--success)" }}
                />
                {t("badge")}
              </div>
              <h1 className="text-[36px] md:text-[44px] leading-tight font-extrabold tracking-tight">
                {t("title1")}
                <span className="text-brand">{t("titleHighlight")}</span>
              </h1>
              <p className="mt-5 text-text-secondary text-[18px] leading-relaxed">
                {t("subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#donate"
                  className="inline-flex items-center justify-center min-h-touch-btn px-8 rounded-md bg-brand text-white font-semibold hover:bg-brand-hover shadow-sm transition active:scale-[0.97]"
                >
                  {t("ctaPrimary")} →
                </a>
                <a
                  href="#allocation"
                  className="inline-flex items-center justify-center min-h-touch-btn px-6 rounded-md bg-bg-surface text-brand font-semibold border-2 border-brand hover:bg-bg-surface transition"
                >
                  {t("ctaSecondary")}
                </a>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-text-tertiary">
                <span>{t("trust1")}</span>
                <span aria-hidden>·</span>
                <span>{t("trust2")}</span>
                <span aria-hidden>·</span>
                <span>{t("trust3")}</span>
              </div>
            </div>

            <ProgressCard
              raisedCents={progress.raisedCents}
              goalCents={progress.goalCents}
              donorCount={progress.donorCount}
            />
          </div>
        </section>

        <ImpactStats />

        <div className="max-w-6xl mx-auto px-5">
          <Stories />
        </div>

        <AllocationDonut />

        {/* Donate form */}
        <section id="donate" className="max-w-3xl mx-auto px-5 py-16 md:py-24">
          <DonateFormHeading />
          <DonateForm locale={locale as DonateLocale} />
        </section>
      </main>
    </>
  );
}

async function DonateFormHeading() {
  const t = await getTranslations("donate.form");
  return (
    <div className="text-center mb-10">
      <div className="text-sm font-semibold text-brand uppercase tracking-wider">
        {t("eyebrow")}
      </div>
      <h2 className="text-h2 md:text-h1 font-extrabold tracking-tight mt-2">
        {t("title")}
      </h2>
      <p className="text-text-secondary mt-3">{t("subtitle")}</p>
    </div>
  );
}
