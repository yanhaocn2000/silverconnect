import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { CheckCircle2, Trash2, Plus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { redirect } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { CURRENCY_SYMBOL } from "@/components/domain/country";
import { getCountry } from "@/components/domain/countryCookie";
import { getSession } from "@/components/domain/sessionCookie";

async function saveServices(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  nextRedirect(`/${locale}/provider/services?saved=1`);
}

const RECOMMENDED: Record<string, [number, number]> = {
  cleaning: [40, 60],
  cooking: [30, 50],
  garden: [40, 60],
  personalCare: [55, 80],
  repair: [50, 75],
};

interface Item {
  key: "cleaning" | "cooking" | "garden" | "personalCare" | "repair";
  rate: number;
  minHours: number;
}

const MOCK: Item[] = [
  { key: "cleaning", rate: 55, minHours: 2 },
  { key: "personalCare", rate: 70, minHours: 1 },
];

export default async function ProviderServicesPage({
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
  const t = await getTranslations("pServices");
  const tCategories = await getTranslations("categories");
  const tCommon = await getTranslations("common");
  const saved = sp.saved === "1";
  const sym = CURRENCY_SYMBOL[country];
  const rate = country === "US" ? 0.65 : 1;

  return (
    <>
      <Header country={country} back signedIn={session.signedIn} initials={session.initials} />
      <main id="main-content" className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12">
        <h1 className="text-h2">{t("title")}</h1>

        {saved && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success">
            <CheckCircle2 size={18} aria-hidden /> {t("saved")}
          </div>
        )}

        <form action={saveServices} className="mt-5 flex flex-col gap-3">
          <input type="hidden" name="locale" value={locale} />
          {MOCK.map((it) => {
            const [minR, maxR] = RECOMMENDED[it.key];
            return (
              <div key={it.key} className="rounded-lg border border-border bg-bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-bold">{tCategories(it.key)}</p>
                  <button type="button" aria-label={t("remove")} className="inline-flex h-9 w-9 items-center justify-center rounded-sm border-[1.5px] border-danger bg-bg-surface text-danger">
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`rate-${it.key}`}>{t("rate")} ({sym})</Label>
                    <Input
                      id={`rate-${it.key}`}
                      name={`rate-${it.key}`}
                      type="number"
                      min={1}
                      defaultValue={Math.round(it.rate * rate)}
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`min-${it.key}`}>{t("minHours")}</Label>
                    <Input
                      id={`min-${it.key}`}
                      name={`min-${it.key}`}
                      type="number"
                      min={1}
                      max={8}
                      defaultValue={it.minHours}
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <p className="mt-2 text-[12px] text-text-tertiary">
                  {t("rangeHint", { min: Math.round(minR * rate), max: Math.round(maxR * rate), sym })}
                </p>
              </div>
            );
          })}

          <button type="button" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-dashed border-border-strong text-[15px] font-semibold text-brand">
            <Plus size={16} aria-hidden /> {t("addService")}
          </button>

          <Button type="submit" variant="primary" block size="md">{tCommon("save")}</Button>
        </form>
      </main>
    </>
  );
}
