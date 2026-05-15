"use client";

import * as React from "react";
import { LayoutDashboard, ListTodo, Calendar, DollarSign, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/components/ui/cn";

const TABS = [
  { key: "navWorkbench", href: "/provider", Icon: LayoutDashboard, exact: true },
  { key: "navJobs", href: "/provider/jobs", Icon: ListTodo, exact: false },
  { key: "navCalendar", href: "/provider/calendar", Icon: Calendar, exact: false },
  { key: "navEarnings", href: "/provider/earnings", Icon: DollarSign, exact: false },
  { key: "navProfile", href: "/provider/profile", Icon: User, exact: false },
] as const;

const HIDE_PATTERNS: RegExp[] = [
  /^\/provider\/register(\/|$)/,
  /^\/provider\/onboarding-status(\/|$)/,
];

export function ProviderBottomTabBar() {
  const t = useTranslations("provider");
  const pathname = usePathname();

  if (pathname && HIDE_PATTERNS.some((re) => re.test(pathname))) return null;

  return (
    <nav
      aria-label="Provider primary navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid h-[84px] grid-cols-5 border-t border-border bg-bg-surface pb-4 md:hidden"
    >
      {TABS.map(({ key, href, Icon, exact }) => {
        const on = exact ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold",
              on ? "text-brand" : "text-text-tertiary"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex h-8 w-14 items-center justify-center rounded-pill transition-colors",
                on && "bg-brand-soft"
              )}
            >
              <Icon size={20} strokeWidth={on ? 2.5 : 2} aria-hidden />
            </span>
            <span>{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
