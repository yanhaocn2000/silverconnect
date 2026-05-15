import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { CheckCircle2, Plus, Trash2, CalendarOff } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/domain/PageStates";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import {
  providerProfiles,
  providerBlockedTimes,
} from "@/lib/db/schema/providers";
import { getCurrentUser } from "@/lib/auth/server";

const REASONS = ["vacation", "training", "other"] as const;
type Reason = (typeof REASONS)[number];

async function ensureProviderId(userId: string): Promise<string | null> {
  const [p] = await db
    .select({ id: providerProfiles.id })
    .from(providerProfiles)
    .where(eq(providerProfiles.userId, userId))
    .limit(1);
  return p?.id ?? null;
}

async function addBlockAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const providerId = await ensureProviderId(me.id);
  if (!providerId) nextRedirect(`/${locale}/provider/register`);

  const fromStr = String(formData.get("from") ?? "");
  const toStr = String(formData.get("to") ?? "");
  const reasonRaw = String(formData.get("reason") ?? "");
  const reason: Reason = (REASONS as readonly string[]).includes(reasonRaw)
    ? (reasonRaw as Reason)
    : "other";

  const startsAt = new Date(`${fromStr}T00:00:00`);
  const endsAt = new Date(`${toStr}T23:59:59`);
  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt.getTime() <= startsAt.getTime()
  ) {
    nextRedirect(`/${locale}/provider/blocked-times?add=1&error=invalid`);
  }

  await db.insert(providerBlockedTimes).values({
    providerId,
    startsAt,
    endsAt,
    reason,
  });
  nextRedirect(`/${locale}/provider/blocked-times?added=1`);
}

async function deleteBlockAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const providerId = await ensureProviderId(me.id);
  if (!providerId) nextRedirect(`/${locale}/provider/register`);
  await db
    .delete(providerBlockedTimes)
    .where(
      and(
        eq(providerBlockedTimes.id, id),
        eq(providerBlockedTimes.providerId, providerId),
      ),
    );
  nextRedirect(`/${locale}/provider/blocked-times`);
}

export default async function BlockedTimesPage({
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
  const t = await getTranslations("pBlocked");
  const tCommon = await getTranslations("common");
  const adding = sp.add === "1";
  const added = sp.added === "1";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const providerId = await ensureProviderId(me.id);
  if (!providerId) nextRedirect(`/${locale}/provider/register`);

  const items = await db
    .select()
    .from(providerBlockedTimes)
    .where(eq(providerBlockedTimes.providerId, providerId))
    .orderBy(asc(providerBlockedTimes.startsAt));

  const fmt = (d: Date) =>
    d.toLocaleDateString(locale === "en" ? "en-AU" : locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <>
      <Header country={country} back signedIn={true} initials={me.initials} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("title")}</h1>
        <p className="mt-1 text-[15px] text-text-secondary">{t("sub")}</p>

        {added && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-3 text-[15px] font-semibold text-success"
          >
            <CheckCircle2 size={18} aria-hidden /> {tCommon("save")}
          </div>
        )}
        {error === "invalid" && (
          <div
            role="alert"
            className="mt-4 rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-3 text-[14px] font-semibold text-danger"
          >
            End date must be after start date.
          </div>
        )}

        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              illustration={CalendarOff as never}
              title={t("empty")}
              cta={
                <a
                  href="?add=1"
                  className="inline-flex h-14 items-center rounded-md bg-brand px-7 text-[17px] font-bold text-white"
                >
                  {t("addBlock")}
                </a>
              }
            />
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-2">
            {items.map((b) => {
              const reasonKey =
                b.reason === "vacation"
                  ? "reasonVacation"
                  : b.reason === "training"
                    ? "reasonTraining"
                    : "reasonOther";
              return (
                <li
                  key={b.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold tabular-nums">
                      {fmt(b.startsAt)} → {fmt(b.endsAt)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-text-secondary">
                      {t(reasonKey)}
                    </p>
                  </div>
                  <form action={deleteBlockAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      aria-label={tCommon("delete")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-sm border-[1.5px] border-danger bg-bg-surface text-danger"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        {!adding && items.length > 0 && (
          <a
            href="?add=1"
            className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border-strong text-[16px] font-semibold text-brand"
          >
            <Plus size={18} aria-hidden /> {t("addBlock")}
          </a>
        )}

        {adding && (
          <form
            action={addBlockAction}
            className="mt-5 flex flex-col gap-4 rounded-lg border-2 border-brand bg-bg-surface p-5"
          >
            <input type="hidden" name="locale" value={locale} />
            <h2 className="text-h3">{t("addBlock")}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="from">{t("from")}</Label>
                <input
                  id="from"
                  name="from"
                  type="date"
                  required
                  className="block h-touch-btn w-full rounded-md border-[1.5px] border-border bg-bg-surface px-4 text-body"
                />
              </div>
              <div>
                <Label htmlFor="to">{t("to")}</Label>
                <input
                  id="to"
                  name="to"
                  type="date"
                  required
                  className="block h-touch-btn w-full rounded-md border-[1.5px] border-border bg-bg-surface px-4 text-body"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="reason">{t("reason")}</Label>
              <select
                id="reason"
                name="reason"
                required
                className="block h-touch-btn w-full rounded-md border-[1.5px] border-border bg-bg-surface px-4 text-body"
              >
                <option value="vacation">{t("reasonVacation")}</option>
                <option value="training">{t("reasonTraining")}</option>
                <option value="other">{t("reasonOther")}</option>
              </select>
            </div>
            <Button type="submit" variant="primary" block size="md">
              {tCommon("save")}
            </Button>
          </form>
        )}
      </main>
    </>
  );
}
