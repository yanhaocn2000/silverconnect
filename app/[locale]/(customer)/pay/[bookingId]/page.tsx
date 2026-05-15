import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect, notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { Lock, CreditCard, AlertTriangle, Check } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { CURRENCY_SYMBOL, TAX_ABBR } from "@/components/domain/country";
import { getCountry } from "@/components/domain/countryCookie";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema/bookings";
import { getCurrentUser } from "@/lib/auth/server";
import { cn } from "@/components/ui/cn";

type PayState = "default" | "loading" | "threeDS" | "failed" | "success";

const VALID: PayState[] = ["default", "loading", "threeDS", "failed", "success"];

function parseState(raw: string | undefined): PayState {
  if (raw && (VALID as string[]).includes(raw)) return raw as PayState;
  return "default";
}

function fmt(n: number): string {
  return n.toFixed(2);
}

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, bookingId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
    notFound();
  }
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("payment");
  const country = await getCountry();
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);

  const [row] = await db
    .select({
      id: bookings.id,
      totalPrice: bookings.totalPrice,
      currency: bookings.currency,
      status: bookings.status,
    })
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.customerId, me.id)))
    .limit(1);
  if (!row) notFound();

  const sym = CURRENCY_SYMBOL[country];
  const taxAbbr = TAX_ABBR[country];
  // Tax rate matches whatever was used when creating the booking. The
  // stored totalPrice is gross; reverse-derive subtotal so the breakdown
  // adds back to the same total the user already saw on the review step.
  const taxRate = country === "AU" ? 0.10 : country === "US" ? 0.08 : 0.13;
  const taxPct = `${Math.round(taxRate * 100)}%`;
  const totalNum = Number(row.totalPrice);
  const subtotal = totalNum / (1 + taxRate);
  const tax = totalNum - subtotal;
  const total = `${sym}${fmt(totalNum)}`;
  const state = parseState(typeof sp.state === "string" ? sp.state : undefined);

  if (state === "success") {
    return (
      <>
        <Header country={country} back signedIn initials={me.initials} />
        <main id="main-content" className="mx-auto flex w-full max-w-content flex-col items-center justify-center bg-bg-surface px-6 py-16 text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-success-soft text-success">
            <Check size={56} strokeWidth={3} aria-hidden />
          </span>
          <h2 className="mt-4 text-[26px] font-extrabold">{t("successTitle")}</h2>
          <p className="mt-1.5 text-[16px] text-text-secondary">
            {t("successAmount", { amount: total })}
          </p>
          <p className="mt-1 text-[14px] text-text-tertiary">{t("redirecting")}</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header country={country} back signedIn initials={me.initials} />
      <main id="main-content" className="mx-auto w-full max-w-content overflow-auto bg-bg-surface px-5 pb-[120px] sm:pb-12 pt-5">
        <h1 className="text-[26px] font-extrabold">{t("title")}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-[14px] text-text-tertiary">
          <Lock size={14} aria-hidden /> {t("secured")}
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            className="flex h-14 items-center justify-center gap-1.5 rounded-md border-[1.5px] border-border bg-black text-[17px] font-bold text-white"
          >
            {t("applePay")}
          </button>
          <button
            type="button"
            className="flex h-14 items-center justify-center gap-1.5 rounded-md border-[1.5px] border-border bg-bg-surface text-[16px] font-bold text-text-primary"
          >
            G Pay · {t("googlePay")}
          </button>
          <div className="my-2 flex items-center gap-3">
            <span className="h-[1px] flex-1 bg-border" aria-hidden />
            <span className="text-[13px] text-text-tertiary">{t("orCard")}</span>
            <span className="h-[1px] flex-1 bg-border" aria-hidden />
          </div>

          <fieldset className="rounded-md border-2 border-brand bg-bg-surface p-3.5">
            <legend className="mb-2.5 flex items-center gap-2.5 text-[16px] font-bold">
              <CreditCard size={22} className="text-brand" aria-hidden />
              <span>{t("card")}</span>
            </legend>
            <input
              aria-label={t("cardNumber")}
              autoComplete="cc-number"
              inputMode="numeric"
              placeholder={t("cardNumber")}
              defaultValue="4242 4242 4242 4242"
              className="block h-12 w-full rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3.5 font-mono text-[16px] text-text-primary"
            />
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <input
                aria-label={t("expLabel")}
                autoComplete="cc-exp"
                inputMode="numeric"
                placeholder={t("expLabel")}
                defaultValue="12 / 28"
                className="block h-12 w-full rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3.5 font-mono text-[16px] text-text-primary"
              />
              <input
                aria-label={t("cvvLabel")}
                autoComplete="cc-csc"
                inputMode="numeric"
                placeholder={t("cvvLabel")}
                defaultValue="123"
                className="block h-12 w-full rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3.5 font-mono text-[16px] text-text-primary"
              />
            </div>
            <input
              aria-label={t("cardName")}
              autoComplete="cc-name"
              placeholder={t("cardName")}
              defaultValue="MARGARET WANG"
              className="mt-2.5 block h-12 w-full rounded-sm border-[1.5px] border-border-strong bg-bg-surface px-3.5 text-[16px] text-text-primary"
            />
          </fieldset>
        </div>

        {state === "failed" && (
          <div
            role="alert"
            className="mt-3.5 flex items-start gap-2.5 rounded-md border-[1.5px] border-danger bg-danger-soft p-3.5"
          >
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="text-[16px] font-bold text-danger">{t("declined")}</p>
              <p className="mt-0.5 text-[14px] text-danger">{t("declinedHint")}</p>
            </div>
          </div>
        )}

        {state === "threeDS" && (
          <div
            role="status"
            className="mt-3.5 rounded-md border-[1.5px] border-brand bg-brand-soft p-4 text-center"
          >
            <p className="text-[16px] font-bold text-brand">{t("threeDS")}</p>
            <p className="mt-1.5 text-[14px] text-brand">{t("threeDSHint")}</p>
          </div>
        )}

        <section className="mt-4 rounded-md border border-border bg-bg-surface p-3.5">
          <div className="flex justify-between text-[14px] text-text-secondary">
            <span>{t("subtotal")}</span>
            <span>{sym}{fmt(subtotal)}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-[14px] text-text-secondary">
            <span>
              {taxAbbr} {taxPct}
            </span>
            <span>{sym}{fmt(tax)}</span>
          </div>
          <div className="mt-2.5 flex justify-between border-t border-border pt-2.5 text-[18px] font-extrabold">
            <span>{t("total")}</span>
            <span className="text-brand">{total}</span>
          </div>
        </section>
      </main>

      <div className="sticky bottom-[84px] z-10 border-t border-border bg-bg-surface p-3 sm:bottom-0">
        {state === "loading" || state === "threeDS" ? (
          <button
            type="button"
            disabled
            className={cn(
              "flex h-14 w-full items-center justify-center gap-2 rounded-md text-[17px] font-bold",
              "bg-bg-surface-2 text-text-tertiary"
            )}
          >
            <span
              aria-hidden
              className="inline-block h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-current border-t-transparent"
            />
            {state === "threeDS" ? t("waitingBank") : t("processing")}
          </button>
        ) : (
          <Link
            href={`/bookings/${bookingId}/success`}
            className="flex h-14 items-center justify-center gap-2 rounded-md bg-brand text-[17px] font-bold text-white hover:bg-brand-hover"
          >
            <Lock size={18} aria-hidden />
            {t("payNow", { amount: total })}
          </Link>
        )}
      </div>
    </>
  );
}
