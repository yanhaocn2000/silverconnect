import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LocaleSync } from "@/components/layout/LocaleSync";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleSync locale={locale} />
      <a
        href="#main-content"
        className="sr-only z-[70] focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:inline-flex focus:h-12 focus:items-center focus:rounded-md focus:bg-brand focus:px-4 focus:text-[15px] focus:font-bold focus:text-white"
      >
        {t("skipToContent")}
      </a>
      {children}
    </NextIntlClientProvider>
  );
}
