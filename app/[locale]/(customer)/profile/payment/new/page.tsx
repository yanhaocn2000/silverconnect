import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import { ChevronLeft, CreditCard, Lock } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Link } from "@/i18n/navigation";
import { getCountry } from "@/components/domain/countryCookie";
import { getCurrentUser } from "@/lib/auth/server";

export default async function NewPaymentMethodPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await getCurrentUser();
  if (!me) nextRedirect(`/${locale}/auth/login`);
  const country = await getCountry();
  const t = await getTranslations("paymentMethods");

  return (
    <>
      <Header country={country} back signedIn={true} initials={me.initials} />
      <main
        id="main-content"
        className="mx-auto w-full max-w-content px-5 pb-[120px] pt-6 sm:pb-12"
      >
        <Link
          href="/profile/payment"
          className="inline-flex h-10 items-center gap-1 text-[13px] font-semibold text-brand"
        >
          <ChevronLeft size={16} aria-hidden /> {t("title")}
        </Link>

        <h1 className="mt-2 text-h2">{t("addCard")}</h1>

        <div className="mt-3 flex items-center gap-2 rounded-md bg-bg-surface-2 px-3.5 py-3 text-[14px] text-text-secondary">
          <Lock size={16} aria-hidden />
          <p>{t("secureNote")}</p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border-strong bg-bg-surface px-5 py-12 text-center">
          <span
            aria-hidden
            className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-soft text-brand"
          >
            <CreditCard size={28} />
          </span>
          <p className="text-[16px] font-bold">
            {locale.startsWith("zh") ? "暂未开放" : "Not yet available"}
          </p>
          <p className="max-w-md text-[14px] text-text-secondary">
            {locale.startsWith("zh")
              ? "添加银行卡将通过 Stripe 安全收单。Stripe 集成上线后此页面会启用真实的 Stripe Elements 表单。"
              : "Card capture goes through Stripe Elements so we never touch raw card data. This page activates once Stripe is wired up."}
          </p>
          <Link
            href="/profile/payment"
            className="mt-3 inline-flex h-12 items-center rounded-md border-[1.5px] border-border-strong bg-bg-surface px-5 text-[15px] font-semibold text-text-primary"
          >
            {locale.startsWith("zh") ? "返回" : "Back"}
          </Link>
        </div>
      </main>
    </>
  );
}
