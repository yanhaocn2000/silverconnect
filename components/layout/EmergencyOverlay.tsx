"use client";

import * as React from "react";
import { AlertTriangle, Phone as PhoneIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { EMERGENCY_NUMBER } from "@/components/domain/country";
import { type CountryCode } from "./CountrySelector";
import { cn } from "@/components/ui/cn";

const HASH = "#sos";

/**
 * Global SOS overlay. Mounted once at the customer-layout root.
 *
 * Trigger paths:
 * 1. URL hash `#sos` — anywhere in the app, navigating to `/whatever#sos`
 *    opens the overlay. Dismissing pops the hash.
 * 2. Keyword detection — listens for AI chat keyword events the future
 *    chat client will dispatch via `window.dispatchEvent(new Event("sc:sos"))`.
 *
 * The overlay is keyboard-trapped (Escape closes), aria-modal, and the
 * call button gets focus on open so a single Tab + Enter dials.
 */
export function EmergencyOverlay({ country = "AU" }: { country?: CountryCode }) {
  const t = useTranslations("emergencyOverlay");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const callRef = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    const sync = () => setOpen(window.location.hash === HASH);
    sync();
    // hashchange fires on both manual edits AND popstate-driven hash
    // changes, so this single listener covers browser-back too.
    window.addEventListener("hashchange", sync);
    const onCustom = () => {
      // Push a dedicated history entry so browser-back closes cleanly.
      if (window.location.hash !== HASH) {
        history.pushState(null, "", window.location.pathname + window.location.search + HASH);
      }
      setOpen(true);
    };
    window.addEventListener("sc:sos", onCustom);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("sc:sos", onCustom);
    };
  }, []);

  const close = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === HASH) {
      // Pop the SOS history entry — browser back-stack stays clean
      // and the hashchange listener flips `open` to false naturally.
      history.back();
    } else {
      setOpen(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    callRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Hide the small SOS trigger on /chat (the chat already has its own
  // emergency CTA in the quick-replies row + composer at the bottom).
  const hideTrigger = pathname?.startsWith("/chat") ?? false;

  if (!open) {
    if (hideTrigger) return null;
    return (
      <button
        type="button"
        aria-label={t("triggerLabel")}
        onClick={() => {
          // pushState (no hashchange-without-history); the listener +
          // popstate-driven onhashchange flip `open` true on next tick.
          if (window.location.hash !== HASH) {
            history.pushState(null, "", window.location.pathname + window.location.search + HASH);
          }
          setOpen(true);
        }}
        className={cn(
          "fixed bottom-[280px] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full",
          "border-[3px] border-bg-base bg-danger text-white",
          "shadow-[0_8px_24px_-6px_color-mix(in_oklab,var(--danger)_50%,transparent)]",
          "md:hidden",
        )}
      >
        <span aria-hidden className="text-[13px] font-extrabold leading-none">
          SOS
        </span>
      </button>
    );
  }

  const num = EMERGENCY_NUMBER[country];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-title"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-[#0F1729] px-8 text-center text-white"
    >
      <button
        type="button"
        aria-label={t("closeLabel")}
        onClick={close}
        className="absolute right-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"
      >
        <X size={24} aria-hidden />
      </button>

      <div
        className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[rgba(220,38,38,0.18)] text-[#FCA5A5]"
        style={{ animation: "sc-pulse 1.5s ease-in-out infinite" }}
        aria-hidden
      >
        <AlertTriangle size={68} />
      </div>
      <h1 id="sos-title" className="text-[30px] font-extrabold text-white">
        {t("title")}
      </h1>
      <p className="text-[18px] leading-snug text-[#CBD5E1]">
        {t(`subtitle${country}` as "subtitleAU" | "subtitleUS" | "subtitleCA")}
      </p>
      <a
        ref={callRef}
        href={`tel:${num}`}
        className="flex h-20 w-full max-w-[320px] items-center justify-center gap-3 rounded-md bg-[#DC2626] text-[28px] font-extrabold text-white shadow-[0_8px_24px_rgba(220,38,38,0.5)] focus-visible:ring-4 focus-visible:ring-white/40"
      >
        <PhoneIcon size={32} aria-hidden />
        {t("callNow", { num })}
      </a>
      <button
        type="button"
        className="h-14 w-full max-w-[320px] rounded-md border-[1.5px] border-white/30 bg-white/10 text-[16px] font-semibold text-white"
        onClick={() => router.push("/profile/emergency")}
      >
        {t("notify")}
      </button>
      <p className="text-[14px] text-[#94A3B8]">{t("close")}</p>
    </div>
  );
}
