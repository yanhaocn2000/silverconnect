import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { getCountry } from "@/components/domain/countryCookie";
import { EmptyState } from "@/components/domain/PageStates";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema/customer-data";
import { getCurrentUser } from "@/lib/auth/server";

async function deleteAddressAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id) nextRedirect(`/${locale}/profile/addresses`);
  await db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, me.id)));
  nextRedirect(`/${locale}/profile/addresses`);
}

async function setDefaultAddressAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id) nextRedirect(`/${locale}/profile/addresses`);
  await db.transaction(async (tx) => {
    await tx
      .update(addresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(addresses.userId, me.id));
    await tx
      .update(addresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(addresses.id, id), eq(addresses.userId, me.id)));
  });
  nextRedirect(`/${locale}/profile/addresses`);
}

export default async function AddressesPage({
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
  if (sp.add === "1") nextRedirect(`/${locale}/profile/addresses/new`);
  const country = await getCountry();
  const t = await getTranslations("addresses");

  const items = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, me.id))
    .orderBy(addresses.createdAt);

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

        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              illustration={MapPin as never}
              title={t("empty")}
              hint={t("emptyHint")}
              cta={
                <Link
                  href="/profile/addresses/new"
                  className="inline-flex h-14 items-center justify-center rounded-md bg-brand px-7 text-[17px] font-bold text-white"
                >
                  {t("addNew")}
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {items.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-border bg-bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand"
                  >
                    <MapPin size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[16px] font-bold">
                        {a.label || t("labelHome")}
                      </p>
                      {a.isDefault && (
                        <span className="inline-flex h-6 items-center rounded-sm bg-success-soft px-2 text-[12px] font-semibold text-success">
                          {t("default")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[14px] text-text-secondary">
                      {a.line1}, {a.city}
                      {a.state ? ` ${a.state}` : ""}
                      {a.postcode ? ` ${a.postcode}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-1.5 rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3 text-[14px] font-semibold text-text-primary opacity-50"
                    disabled
                    title="Edit not yet wired"
                  >
                    <Pencil size={14} aria-hidden /> {t("edit")}
                  </button>
                  {!a.isDefault && (
                    <form action={setDefaultAddressAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3 text-[14px] font-semibold text-text-primary"
                      >
                        {t("setDefault")}
                      </button>
                    </form>
                  )}
                  <form action={deleteAddressAction} className="ml-auto">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={a.id} />
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
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <Link
            href="/profile/addresses/new"
            className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border-strong text-[16px] font-semibold text-brand"
          >
            <Plus size={20} aria-hidden /> {t("addNew")}
          </Link>
        )}
      </main>
    </>
  );
}
