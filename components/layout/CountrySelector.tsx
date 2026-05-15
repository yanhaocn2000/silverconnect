"use client";

import * as React from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/components/ui/cn";

const COUNTRIES = [
  { code: "AU", flag: "🇦🇺" },
  { code: "US", flag: "🇺🇸" },
  { code: "CA", flag: "🇨🇦" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export const COUNTRY_FLAG: Record<CountryCode, string> = {
  AU: "🇦🇺",
  US: "🇺🇸",
  CA: "🇨🇦",
};

/** Compact chip used in the mobile header — flag + 2-letter code, no dropdown. */
export function CountryChip({
  value,
  className,
}: {
  value: CountryCode;
  /** Reserved for future per-locale country labels. */
  locale?: Locale;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-pill border-[1.5px] border-border bg-bg-surface px-2.5 text-[14px] font-semibold text-text-primary",
        className
      )}
      aria-label={`Country: ${value}`}
    >
      <span aria-hidden>{COUNTRY_FLAG[value]}</span>
      <span>{value}</span>
    </span>
  );
}

/** Original full dropdown — retained for places that need to switch country. */
export function CountrySelector({
  value,
  onChange,
  className,
}: {
  value: CountryCode;
  onChange: (code: CountryCode) => void;
  className?: string;
}) {
  const t = useTranslations("country");
  const current = COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0];

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        aria-label={`Country: ${current.code}`}
        className={cn(
          "inline-flex h-touch-btn min-w-[88px] items-center gap-1 rounded-md border border-border bg-bg-surface px-3 text-body text-text-primary",
          className
        )}
      >
        <span aria-hidden>{current.flag}</span>
        <span className="font-semibold">{current.code}</span>
        <ChevronDown size={16} className="ml-auto" aria-hidden />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[180px] rounded-md border border-border bg-bg-surface p-1 shadow-card"
        >
          {COUNTRIES.map((c) => (
            <Dropdown.Item
              key={c.code}
              onSelect={() => onChange(c.code)}
              className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-body text-text-primary outline-none hover:bg-bg-surface focus:bg-bg-surface"
            >
              <span aria-hidden>{c.flag}</span>
              <span>{t(c.code)}</span>
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
