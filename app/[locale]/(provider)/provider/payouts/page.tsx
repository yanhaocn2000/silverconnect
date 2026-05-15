import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { CheckCircle2, ArrowRightCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { redirect } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";
import { priceCountry } from "@/components/domain/pricing";

interface PayoutItem {
  id: string;
  amount: number;
  dateISO: string;
  stripeTransferId: string;
}

const MOCK_PAYOUTS: PayoutItem[] = [
  {
    id: "po_1",
    amount: 320,
    dateISO: new Date(Date.now() - 86400000 * 5).toISOString(),
    stripeTransferId: "tr_1RxK91234567",
  },
  {
    id: "po_2",
    amount: 245,
    dateISO: new Date(Date.now() - 86400000 * 12).toISOString(),
    stripeTransferId: "tr_1RxK91234561",
  },
  {
    id: "po_3",
    amount: 180,
    dateISO: new Date(Date.now() - 86400000 * 19).toISOString(),
    stripeTransferId: "tr_1RxK91234555",
  },
];

async function saveFrequency(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const freq = String(formData.get("freq") ?? "weekly");
  nextRedirect(`/${locale}/provider/payouts?freq=${freq}&saved=1`);
}

export default async function ProviderPayoutsPage({
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
  const t = await getTranslations("provider");
  const tCommon = await getTranslations("common");

  const saved = sp.saved === "1";
  const currentFreq =
    typeof sp.freq === "string" && ["daily", "weekly", "manual"].includes(sp.freq)
      ? sp.freq
      : "weekly";

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
        <h1 className="text-h2">{t("payoutsTitle")}</h1>

        {saved && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success"
          >
            <CheckCircle2 size={18} aria-hidden /> {tCommon("save")}
          </div>
        )}

        {/* Stripe account */}
        <section className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-bg-surface p-4">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-success-soft text-success"
          >
            <CheckCircle2 size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">{t("payoutsAccount")}</p>
            <p className="mt-0.5 text-[14px] font-semibold text-success">
              {t("payoutsAccountActive")}
            </p>
            <button
              type="button"
              className="mt-2 inline-flex h-10 items-center rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3 text-[13px] font-semibold text-text-primary"
            >
              {t("payoutsReverify")}
            </button>
          </div>
        </section>

        {/* Frequency */}
        <form
          action={saveFrequency}
          className="mt-5 rounded-lg border border-border bg-bg-surface p-4"
        >
          <input type="hidden" name="locale" value={locale} />
          <fieldset>
            <legend className="text-[15px] font-bold">{t("payoutsFreq")}</legend>
            <ul className="mt-3 flex flex-col gap-2">
              {(["daily", "weekly", "manual"] as const).map((f) => (
                <li key={f}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-border bg-bg-surface p-3.5 has-[:checked]:border-2 has-[:checked]:border-brand">
                    <input
                      type="radio"
                      name="freq"
                      value={f}
                      defaultChecked={f === currentFreq}
                      className="peer sr-only"
                    />
                    <span
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border-strong after:hidden after:h-3 after:w-3 after:rounded-full after:bg-brand after:content-[''] peer-checked:border-brand peer-checked:after:block"
                      aria-hidden
                    />
                    <span className="text-[15px]">
                      {t(
                        f === "daily"
                          ? "payoutsFreqDaily"
                          : f === "weekly"
                          ? "payoutsFreqWeekly"
                          : "payoutsFreqManual"
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-4">
            <Button type="submit" variant="primary" size="md">
              {tCommon("save")}
            </Button>
          </div>
        </form>

        {/* History */}
        <section className="mt-5">
          <p className="text-[15px] font-bold">{t("payoutsHistory")}</p>
          <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-bg-surface">
            {MOCK_PAYOUTS.map((p, i) => (
              <li
                key={p.id}
                className={
                  "flex items-center gap-3 px-4 py-3.5 " +
                  (i > 0 ? "border-t border-border" : "")
                }
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-success-soft text-success"
                >
                  <ArrowRightCircle size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold tabular-nums">
                    {priceCountry(country, p.amount)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-text-tertiary tabular-nums">
                    {new Date(p.dateISO).toLocaleDateString(
                      locale === "en" ? "en-AU" : locale,
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                    {" · "}
                    {p.stripeTransferId}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
