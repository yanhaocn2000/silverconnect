import { setRequestLocale, getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default async function OopsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("oops");

  return (
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg-base px-5 py-12 text-center"
    >
      <span className="flex h-24 w-24 items-center justify-center rounded-pill bg-warning-soft text-warning">
        <AlertTriangle size={56} aria-hidden />
      </span>
      <h1 className="text-h1">{t("title")}</h1>
      <p className="max-w-[360px] text-body text-text-secondary">{t("sub")}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/home"
          className="inline-flex h-14 items-center rounded-md bg-brand px-7 text-[17px] font-bold text-white hover:bg-brand-hover"
        >
          {t("home")}
        </Link>
        <Link
          href="/help"
          className="inline-flex h-14 items-center rounded-md border-[1.5px] border-border-strong bg-bg-surface px-5 text-[15px] font-semibold text-text-primary hover:bg-bg-surface-2"
        >
          {t("contact")}
        </Link>
      </div>
    </main>
  );
}
