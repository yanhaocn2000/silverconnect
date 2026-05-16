import * as React from "react";
import { cn } from "@/components/ui/cn";

/**
 * 4-segment booking-wizard progress bar (design: customer-pages.jsx
 * WizProgress). Segment fills brand for steps ≤ current. The per-step
 * eyebrow ("第 N 步 / 4") + title live in each step's page body.
 */
export function BookingProgress({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div
      aria-label={`Booking step ${step} of 4`}
      className="flex gap-2 border-b border-border bg-bg-surface px-5 py-4"
    >
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          aria-hidden
          className={cn(
            "h-1.5 flex-1 rounded-pill",
            n <= step ? "bg-brand" : "bg-bg-surface-2"
          )}
        />
      ))}
    </div>
  );
}
