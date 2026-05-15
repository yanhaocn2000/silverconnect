"use client";

import * as React from "react";
import { MessageCircleHeart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/components/ui/cn";

/**
 * Routes where the floating "Ask AI" button is hidden:
 * - /chat (the chat IS the AI)
 * - /pay/* and /bookings/[id]/success (sticky payment / success CTAs)
 * - /providers/[id], /bookings/[id], /bookings/new (sticky CTA bars)
 * - /dev/* internal preview routes
 *
 * Hidden on tablet/desktop too (md:hidden) — those breakpoints surface
 * the "Ask AI" entry inside the Header navigation instead.
 */
const HIDE_PATTERNS: RegExp[] = [
  /^\/chat(\/|$|\?)/,
  /^\/pay(\/|$)/,
  /^\/providers\/[^/]+/,
  /^\/bookings\/[^/]+/,
  /^\/bookings\/new(\/|$)/,
  /^\/dev(\/|$)/,
];

function shouldHide(pathname: string): boolean {
  return HIDE_PATTERNS.some((re) => re.test(pathname));
}

export function AIFloatButton({ className }: { className?: string }) {
  const t = useTranslations("common");
  const pathname = usePathname();

  if (shouldHide(pathname ?? "")) return null;

  return (
    <Link
      href="/chat"
      aria-label={t("askAI")}
      className={cn(
        "fixed bottom-[200px] right-4 z-30 inline-flex items-center gap-1.5",
        "rounded-pill bg-brand px-[18px] py-3 text-[14px] font-bold text-white",
        "shadow-[0_8px_24px_-6px_color-mix(in_oklab,var(--brand-primary)_50%,transparent)]",
        "md:hidden",
        className,
      )}
    >
      <MessageCircleHeart size={16} aria-hidden />
      {t("askAI")}
    </Link>
  );
}
