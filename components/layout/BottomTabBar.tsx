"use client";

import * as React from "react";
import { Home, Grid3x3, Calendar, MessageCircle, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/components/ui/cn";

const TABS = [
  { key: "home", href: "/home", Icon: Home },
  { key: "services", href: "/services", Icon: Grid3x3 },
  { key: "bookings", href: "/bookings", Icon: Calendar },
  { key: "messages", href: "/chat", Icon: MessageCircle },
  { key: "profile", href: "/profile", Icon: User },
] as const;

// Hide tab bar on routes that are themselves a full-screen experience
// or that own a sticky bottom CTA; matches the design's per-screen layout.
const HIDE_PATTERNS: RegExp[] = [/^\/chat(\/|$|\?)/, /^\/dev(\/|$)/];

export function BottomTabBar({ active }: { active?: (typeof TABS)[number]["key"] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  if (pathname && HIDE_PATTERNS.some((re) => re.test(pathname))) return null;

  return (
    <nav
      role="navigation"
      aria-label={t("primary")}
      className="fixed inset-x-0 bottom-0 z-30 grid h-[84px] grid-cols-5 border-t border-border bg-bg-surface pb-4 md:hidden"
    >
      {TABS.map(({ key, href, Icon }) => {
        const on = active ? key === active : pathname?.startsWith(href);
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
