import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { CreditCard, Plus, Lock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { getCountry } from "@/components/domain/countryCookie";
import { DeleteCardConfirm } from "@/components/domain/DeleteCardConfirm";
import { EmptyState } from "@/components/domain/PageStates";
import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema/customer-data";
import { getCurrentUser } from "@/lib/auth/server";

async function deleteCardAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id) nextRedirect(`/${locale}/profile/payment`);
  await db
    .delete(paymentMethods)
    .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, me.id)));
  nextRedirect(`/${locale}/profile/payment`);
}

async function setDefaultCardAction(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  if (!id) nextRedirect(`/${locale}/profile/payment`);
  await db.transaction(async (tx) => {
    await tx
      .update(paymentMethods)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(paymentMethods.userId, me.id));
    await tx
      .update(paymentMethods)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, me.id)));
  });
  nextRedirect(`/${locale}/profile/payment`);
}

export default async function ProfilePaymentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const country = await getCountry();
  const t = await getTranslations("paymentMethods");
  const tCommon = await getTranslations("common");

  const items = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, me.id))
    .orderBy(paymentMethods.createdAt);

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

        <div className="mt-3 flex items-center gap-2 rounded-md bg-bg-surface-2 px-3.5 py-3 text-[14px] text-text-secondary">
          <Lock size={16} aria-hidden />
          <p>{t("secureNote")}</p>
        </div>

        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              illustration={CreditCard as never}
              title={t("empty")}
              hint={t("emptyHint")}
              cta={
                <Link
                  href="/profile/payment/new"
                  className="inline-flex h-14 items-center justify-center rounded-md bg-brand px-7 text-[17px] font-bold text-white"
                >
                  {t("addCard")}
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {items.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-4"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-14 shrink-0 items-center justify-center rounded-sm bg-text-primary text-[12px] font-bold text-bg-base"
                >
                  {(c.brand ?? "CARD").toUpperCase().slice(0, 4)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[16px] font-bold tabular-nums">
                      {t("endingIn", { last4: c.last4 ?? "????" })}
                    </p>
                    {c.isDefault && (
                      <span className="inline-flex h-6 items-center rounded-sm bg-success-soft px-2 text-[12px] font-semibold text-success">
                        {t("default")}
                      </span>
                    )}
                  </div>
                  {c.expMonth !== null && c.expYear !== null && (
                    <p className="mt-0.5 text-[13px] text-text-secondary tabular-nums">
                      {t("expires", {
                        month: String(c.expMonth).padStart(2, "0"),
                        year: c.expYear,
                      })}
                    </p>
                  )}
                </div>
                {!c.isDefault && (
                  <form action={setDefaultCardAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3 text-[14px] font-semibold text-text-primary"
                    >
                      {t("setDefault")}
                    </button>
                  </form>
                )}
                <DeleteCardConfirm
                  action={deleteCardAction}
                  locale={locale}
                  cardId={c.id}
                  strings={{
                    triggerAriaLabel: t("delete"),
                    title: t("deleteCardTitle"),
                    body: t("deleteCardBody", { last4: c.last4 ?? "????" }),
                    cancel: tCommon("cancel"),
                    confirm: t("delete"),
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <Link
            href="/profile/payment/new"
            className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border-strong text-[16px] font-semibold text-brand"
          >
            <Plus size={20} aria-hidden /> {t("addCard")}
          </Link>
        )}
      </main>
    </>
  );
}
