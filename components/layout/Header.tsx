"use client";

import * as React from "react";
import { ChevronLeft, Heart, User, Briefcase } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { type CountryCode } from "./CountrySelector";
import { CountrySwitcher } from "./CountrySwitcher";
import { DesktopNav } from "./DesktopNav";
import { LanguageChip } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";

export interface HeaderProps {
  back?: boolean;
  onBack?: () => void;
  country?: CountryCode;
  signedIn?: boolean;
  initials?: string;
  rightExtra?: React.ReactNode;
}

export function Header({
  back = false,
  onBack,
  country = "AU",
  signedIn = false,
  initials,
  rightExtra,
}: HeaderProps) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-bg-base px-4 sm:h-20 sm:px-8"
    >
      <div className="flex min-w-0 items-center gap-2">
        {back ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label={t("back")}
            className="-ml-2 inline-flex h-12 w-12 items-center justify-center rounded-md text-text-primary hover:bg-bg-surface-2"
          >
            <ChevronLeft size={24} aria-hidden />
          </button>
        ) : (
          <Link
            href="/home"
            className="text-[20px] font-extrabold tracking-tight text-brand sm:text-[24px]"
            aria-label="SilverConnect home"
          >
            SilverConnect
          </Link>
        )}
        <DesktopNav />
      </div>
      <div className="flex items-center gap-1.5">
        {rightExtra}
        <Link
          href="/donate"
          aria-label={tNav("donate")}
          className="inline-flex h-12 items-center gap-1.5 rounded-md bg-brand-soft px-2.5 text-[13px] font-bold text-brand transition-colors hover:bg-brand hover:text-white sm:px-4 sm:text-[14px]"
        >
          <Heart size={16} aria-hidden className="fill-current" />
          <span className="hidden sm:inline">{tNav("donate")}</span>
        </Link>
        {signedIn && (
          <Link
            href="/provider"
            aria-label={tNav("providerMode")}
            className="inline-flex h-12 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-bold text-text-secondary transition-colors hover:bg-bg-surface-2 sm:px-4 sm:text-[14px]"
          >
            <Briefcase size={16} aria-hidden />
            <span className="hidden sm:inline">{tNav("providerMode")}</span>
          </Link>
        )}
        <ThemeToggle />
        <CountrySwitcher value={country} />
        <LanguageChip />
        {signedIn ? (
          <Link
            href="/profile"
            aria-label={tNav("profile")}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent-soft text-[14px] font-bold text-[#92590A] dark:text-[var(--brand-accent)]"
          >
            {initials ?? <User size={22} aria-hidden />}
          </Link>
        ) : (
          <Link
            href="/auth/login"
            className="inline-flex h-12 items-center rounded-md bg-brand px-4 text-[14px] font-bold text-white hover:bg-brand-hover"
          >
            {t("signIn")}
          </Link>
        )}
      </div>
    </header>
  );
}
