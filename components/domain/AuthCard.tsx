import * as React from "react";
import { cn } from "@/components/ui/cn";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * Centered auth card — full-screen on mobile, wider card on desktop.
 * Page bg = bg-base (cream); card bg = bg-surface (white) so the card
 * floats on the page (matches Phase 1 design). Theme toggle docked in
 * the card's top-right; auth/layout therefore does NOT need to mount
 * its own PublicThemeCorner.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  className,
  hideHero,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  /** Hide the default "S" brand logo above the title — useful for pages that
   *  carry their own hero icon (verify, reset success, etc.) and would otherwise
   *  show two competing icons. */
  hideHero?: boolean;
}) {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh items-stretch justify-center bg-bg-base sm:items-center sm:px-4 sm:py-10"
    >
      <section
        className={cn(
          "relative flex w-full max-w-[480px] flex-col bg-bg-surface px-5 pb-10 pt-8",
          "sm:rounded-lg sm:border sm:border-border sm:px-8 sm:py-10 sm:shadow-card",
          "md:max-w-[640px] md:px-12 md:py-12",
          className
        )}
      >
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <ThemeToggle className="h-10 w-10" />
        </div>
        <div className="flex flex-col items-center text-center">
          {!hideHero && (
            <span
              aria-hidden
              className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-[20px] font-extrabold text-white"
            >
              S
            </span>
          )}
          <h1 className="text-[26px] font-extrabold leading-tight md:text-[32px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-[420px] text-[15px] text-text-secondary md:text-body">
              {subtitle}
            </p>
          )}
        </div>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}
