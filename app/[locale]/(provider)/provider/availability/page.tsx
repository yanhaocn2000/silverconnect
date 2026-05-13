import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import {
  providerProfiles,
  providerAvailability,
} from "@/lib/db/schema/providers";
import { getCurrentUser } from "@/lib/auth/server";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const SLOTS = ["morning", "afternoon", "evening"] as const;
type Slot = (typeof SLOTS)[number];

const DAY_KEYS: Record<
  (typeof DAYS)[number],
  | "weekMon"
  | "weekTue"
  | "weekWed"
  | "weekThu"
  | "weekFri"
  | "weekSat"
  | "weekSun"
> = {
  Mon: "weekMon",
  Tue: "weekTue",
  Wed: "weekWed",
  Thu: "weekThu",
  Fri: "weekFri",
  Sat: "weekSat",
  Sun: "weekSun",
};
function dayIndex(label: (typeof DAYS)[number]): number {
  return DAYS.indexOf(label) + 1; // ISO Mon=1..Sun=7
}

async function ensureProviderId(userId: string): Promise<string | null> {
  const [p] = await db
    .select({ id: providerProfiles.id })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, userId))
    .limit(1);
  return p?.id ?? null;
}

async function saveAvailabilityAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const providerId = await ensureProviderId(me.id);
  if (!providerId) nextRedirect(`/${locale}/provider/register`);

  const rows: { providerId: string; dayOfWeek: number; slot: Slot }[] = [];
  for (const d of DAYS) {
    const slots = formData
      .getAll(`avail_${d}`)
      .map(String)
      .filter((s): s is Slot => SLOTS.includes(s as Slot));
    for (const s of slots) {
      rows.push({ providerId, dayOfWeek: dayIndex(d), slot: s });
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(providerAvailability)
      .where(eq(providerAvailability.providerId, providerId));
    if (rows.length > 0) {
      await tx.insert(providerAvailability).values(rows);
    }
  });

  nextRedirect(`/${locale}/provider/availability?saved=1`);
}

async function applyTemplateAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const tpl = String(formData.get("tpl") ?? "");
  nextRedirect(`/${locale}/provider/availability?tpl=${tpl}`);
}

function templateChecked(
  day: (typeof DAYS)[number],
  slot: Slot,
  tpl: string | undefined,
): boolean {
  if (tpl === "mwf") {
    return (day === "Mon" || day === "Wed" || day === "Fri") && slot === "morning";
  }
  if (tpl === "weekday") {
    return day !== "Sat" && day !== "Sun" && slot === "afternoon";
  }
  return false;
}

export default async function ProviderAvailabilityPage({
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
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const country = await getCountry();
  const t = await getTranslations("provider");
  const tCommon = await getTranslations("common");
  const saved = sp.saved === "1";
  const tpl = typeof sp.tpl === "string" ? sp.tpl : undefined;

  const providerId = await ensureProviderId(me.id);
  if (!providerId) nextRedirect(`/${locale}/provider/register`);

  // Existing rows
  const existing = await db
    .select({
      dayOfWeek: providerAvailability.dayOfWeek,
      slot: providerAvailability.slot,
    })
    .from(providerAvailability)
    .where(eq(providerAvailability.providerId, providerId));
  const existingSet = new Set(
    existing.map((r) => `${r.dayOfWeek}|${r.slot}`),
  );

  function isChecked(day: (typeof DAYS)[number], slot: Slot): boolean {
    if (tpl) return templateChecked(day, slot, tpl);
    return existingSet.has(`${dayIndex(day)}|${slot}`);
  }

  return (
    <>
      <Header country={country} back signedIn={true} initials={me.initials} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("availabilityTitle")}</h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          {t("availabilityHint")}
        </p>

        {saved && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success"
          >
            <CheckCircle2 size={18} aria-hidden /> {tCommon("save")}
          </div>
        )}

        <section className="mt-5 rounded-lg border border-border bg-bg-base p-4">
          <p className="text-[14px] font-bold">{t("availabilityApply")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <TemplateForm
              locale={locale}
              tpl="mwf"
              label={t("availabilityTemplateMWF")}
            />
            <TemplateForm
              locale={locale}
              tpl="weekday"
              label={t("availabilityTemplateWeekday")}
            />
          </div>
          {tpl && (
            <p className="mt-3 text-[12px] text-text-tertiary">
              Template previewed — hit Save to apply.
            </p>
          )}
        </section>

        <form
          action={saveAvailabilityAction}
          className="mt-5 flex flex-col gap-3"
        >
          <input type="hidden" name="locale" value={locale} />
          {DAYS.map((d) => (
            <div
              key={d}
              className="grid grid-cols-[60px_1fr] items-center gap-3 rounded-lg border border-border bg-bg-base p-3"
            >
              <span className="text-[15px] font-bold">{t(DAY_KEYS[d])}</span>
              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map((s) => (
                  <label
                    key={s}
                    className="inline-flex h-12 cursor-pointer items-center justify-center rounded-sm border-[1.5px] border-border-strong bg-bg-base px-2 text-[14px] font-semibold text-text-primary has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand"
                  >
                    <input
                      type="checkbox"
                      name={`avail_${d}`}
                      value={s}
                      defaultChecked={isChecked(d, s)}
                      className="sr-only"
                    />
                    {t(s)}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <Button type="submit" variant="primary" block size="md">
            {tCommon("save")}
          </Button>
        </form>
      </main>
    </>
  );
}

function TemplateForm({
  locale,
  tpl,
  label,
}: {
  locale: string;
  tpl: string;
  label: string;
}) {
  return (
    <form action={applyTemplateAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="tpl" value={tpl} />
      <button
        type="submit"
        className="inline-flex h-10 items-center rounded-pill border-[1.5px] border-brand bg-bg-base px-4 text-[14px] font-semibold text-brand"
      >
        {label}
      </button>
    </form>
  );
}
