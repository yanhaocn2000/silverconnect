"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { Link } from "@/i18n/navigation";

export default function LocaleErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  React.useEffect(() => {
    Sentry.captureException(error);
    if (process.env.NODE_ENV !== "production") {
       
      console.error("[error.tsx]", error);
    }
  }, [error]);

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-content flex-col items-center gap-3 px-5 pb-12 pt-12 text-center"
    >
      <span
        aria-hidden
        className="flex h-24 w-24 items-center justify-center rounded-full bg-warning-soft text-warning"
      >
        <AlertTriangle size={56} />
      </span>
      <h1 className="text-h1">{t("title")}</h1>
      <p className="max-w-[340px] text-[16px] text-text-secondary">{t("sub")}</p>
      {error.digest && (
        <p className="text-[12px] text-text-tertiary tabular-nums">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-14 items-center rounded-md bg-brand px-7 text-[17px] font-bold text-white"
        >
          {t("retry")}
        </button>
        <Link
          href="/home"
          className="inline-flex h-14 items-center rounded-md border-[1.5px] border-border-strong bg-bg-surface px-5 text-[15px] font-semibold text-text-primary hover:bg-bg-surface-2"
        >
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
