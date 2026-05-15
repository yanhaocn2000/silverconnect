"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";

const STEP_KEYS = ["service", "time", "address", "confirm"] as const;

export function BookingProgress({ step }: { step: 1 | 2 | 3 | 4 }) {
  const t = useTranslations("booking.steps");

  return (
    <ol
      aria-label="Booking progress"
      className="flex items-center justify-center gap-1 bg-bg-surface px-4 py-3"
    >
      {STEP_KEYS.map((key, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        const isLast = i === STEP_KEYS.length - 1;
        return (
          <React.Fragment key={key}>
            <li className="flex flex-col items-center gap-1" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold",
                  done && "bg-success text-white",
                  active && "bg-brand text-white shadow-[0_0_0_4px_var(--brand-primary-soft)]",
                  !done && !active && "bg-bg-surface-2 text-text-tertiary"
                )}
              >
                {done ? <Check size={14} strokeWidth={3} aria-hidden /> : idx}
              </span>
              <span
                className={cn(
                  "text-[12px]",
                  active ? "font-bold text-brand" : "font-medium text-text-secondary"
                )}
              >
                {t(key)}
              </span>
            </li>
            {!isLast && (
              <span
                className={cn(
                  "mb-[18px] h-[2px] flex-1",
                  idx < step ? "bg-success" : "bg-border"
                )}
                aria-hidden
              />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
