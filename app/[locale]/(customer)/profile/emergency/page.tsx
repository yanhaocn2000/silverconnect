import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { PhoneCall, Plus, Trash2, ShieldAlert } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getCountry } from "@/components/domain/countryCookie";
import { EmptyState } from "@/components/domain/PageStates";
import { db } from "@/lib/db";
import { emergencyContacts } from "@/lib/db/schema/customer-data";
import { getCurrentUser } from "@/lib/auth/server";

const REL_KEYS = ["daughter", "spouse", "sibling", "friend", "other"] as const;

function relTranslationKey(rel: string | null): string {
  switch (rel) {
    case "daughter": return "relDaughter";
    case "spouse":   return "relSpouse";
    case "sibling":  return "relSibling";
    case "friend":   return "relFriend";
    case "other":    return "relOther";
    default:         return "relOther";
  }
}

async function addContactAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const rel = String(formData.get("relationship") ?? "");
  const relationship = (REL_KEYS as readonly string[]).includes(rel) ? rel : null;
  if (!name || !phone) {
    nextRedirect(`/${locale}/profile/emergency?add=1&error=required`);
  }
  const existing = await db
    .select({ id: emergencyContacts.id })
    .from(emergencyContacts)
    .where(eq(emergencyContacts.userId, me.id));
  await db.insert(emergencyContacts).values({
    userId: me.id,
    name,
    phone,
    relationship,
    priority: existing.length === 0 ? 1 : 2,
  });
  nextRedirect(`/${locale}/profile/emergency`);
}

async function deleteContactAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id) nextRedirect(`/${locale}/profile/emergency`);
  await db
    .delete(emergencyContacts)
    .where(
      and(eq(emergencyContacts.id, id), eq(emergencyContacts.userId, me.id)),
    );
  nextRedirect(`/${locale}/profile/emergency`);
}

async function setPrimaryAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id) nextRedirect(`/${locale}/profile/emergency`);
  await db.transaction(async (tx) => {
    await tx
      .update(emergencyContacts)
      .set({ priority: 2, updatedAt: new Date() })
      .where(eq(emergencyContacts.userId, me.id));
    await tx
      .update(emergencyContacts)
      .set({ priority: 1, updatedAt: new Date() })
      .where(
        and(eq(emergencyContacts.id, id), eq(emergencyContacts.userId, me.id)),
      );
  });
  nextRedirect(`/${locale}/profile/emergency`);
}

export default async function EmergencyContactsPage({
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
  const t = await getTranslations("emergencyContacts");
  const tCommon = await getTranslations("common");
  const adding = sp.add === "1";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const items = await db
    .select()
    .from(emergencyContacts)
    .where(eq(emergencyContacts.userId, me.id))
    .orderBy(emergencyContacts.priority, emergencyContacts.createdAt);

  return (
    <>
      <Header
        country={country}
        back
        signedIn={true}
        initials={me.initials}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <h1 className="text-h2">{t("title")}</h1>
        <p className="mt-1 text-[15px] text-text-secondary">{t("sub")}</p>

        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              illustration={ShieldAlert as never}
              title={t("empty")}
              hint={t("emptyHint")}
              cta={
                <a
                  href="?add=1"
                  className="inline-flex h-14 items-center justify-center rounded-md bg-brand px-7 text-[17px] font-bold text-white"
                >
                  {t("addContact")}
                </a>
              }
            />
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {items.map((c) => {
              const isPrimary = c.priority === 1;
              return (
                <li
                  key={c.id}
                  className="rounded-lg border border-border bg-bg-surface p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger"
                    >
                      <PhoneCall size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[16px] font-bold">{c.name}</p>
                        {isPrimary && (
                          <span className="inline-flex h-6 items-center rounded-sm bg-danger-soft px-2 text-[12px] font-semibold text-danger">
                            {t("primary")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[14px] text-text-secondary">
                        {t(relTranslationKey(c.relationship) as Parameters<typeof t>[0])} · <span className="tabular-nums">{c.phone}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!isPrimary && (
                      <form action={setPrimaryAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3 text-[14px] font-semibold text-text-primary"
                        >
                          {t("setPrimary")}
                        </button>
                      </form>
                    )}
                    <form action={deleteContactAction} className="ml-auto">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        aria-label={t("delete")}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-sm border-[1.5px] border-danger bg-bg-surface text-danger"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </form>
                  </div>
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
            <Plus size={20} aria-hidden /> {t("addContact")}
          </a>
        )}

        {adding && (
          <form
            action={addContactAction}
            className="mt-5 flex flex-col gap-4 rounded-lg border-2 border-brand bg-bg-surface p-5"
          >
            <input type="hidden" name="locale" value={locale} />
            <h2 className="text-h3">{t("addContact")}</h2>
            {error === "required" && (
              <div
                role="alert"
                className="rounded-md border-[1.5px] border-danger bg-danger-soft px-3.5 py-2 text-[14px] font-semibold text-danger"
              >
                {t("emptyHint")}
              </div>
            )}
            <div>
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" name="name" autoComplete="name" required />
            </div>
            <div>
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+61 412 345 678"
                required
              />
            </div>
            <div>
              <Label htmlFor="relationship">{t("relationship")}</Label>
              <select
                id="relationship"
                name="relationship"
                required
                className="block h-touch-btn w-full rounded-md border-[1.5px] border-border bg-bg-surface px-4 text-body text-text-primary focus:border-brand focus:outline-none"
              >
                <option value="daughter">{t("relDaughter")}</option>
                <option value="spouse">{t("relSpouse")}</option>
                <option value="sibling">{t("relSibling")}</option>
                <option value="friend">{t("relFriend")}</option>
                <option value="other">{t("relOther")}</option>
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
