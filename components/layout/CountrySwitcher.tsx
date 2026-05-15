"use client";

import * as React from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import { COUNTRY_FLAG, type CountryCode } from "./CountrySelector";

const COUNTRY_LIST: CountryCode[] = ["AU", "US", "CA"];
const COOKIE_NAME = "sc-country";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Compact country chip that opens a dropdown and persists the choice
 * to a cookie, then refreshes the route so server-rendered prices /
 * tax labels update.
 */
export function CountrySwitcher({
  value,
  className,
}: {
  value: CountryCode;
  className?: string;
}) {
  const t = useTranslations("country");
  const router = useRouter();

  const onSelect = (next: CountryCode) => {
    if (next === value) return;
    // Writing the cookie is a deliberate side effect of the user clicking
    // a menu item; the React Compiler immutability rule doesn't apply.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    router.refresh();
  };

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        aria-label={`Country: ${value}`}
        className={cn(
          "inline-flex h-12 min-w-touch items-center justify-center gap-1 rounded-pill border-[1.5px] border-border bg-bg-surface px-2 text-[14px] font-semibold text-text-primary sm:px-3",
          className
        )}
      >
        <span aria-hidden>{COUNTRY_FLAG[value]}</span>
        <span className="hidden sm:inline">{value}</span>
        <ChevronDown size={14} className="ml-0.5 hidden sm:inline" aria-hidden />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[180px] rounded-md border border-border bg-bg-surface p-1 shadow-popover"
        >
          {COUNTRY_LIST.map((c) => (
            <Dropdown.Item
              key={c}
              onSelect={() => onSelect(c)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-body text-text-primary outline-none hover:bg-bg-surface focus:bg-bg-surface",
                c === value && "bg-bg-surface-2 font-semibold"
              )}
            >
              <span aria-hidden>{COUNTRY_FLAG[c]}</span>
              <span>{t(c)}</span>
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
