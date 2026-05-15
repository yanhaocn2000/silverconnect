import * as React from "react";
import { cn } from "./cn";

export type StatBadgeTone = "neutral" | "brand" | "success" | "warn" | "danger";

const toneClass: Record<StatBadgeTone, string> = {
  neutral: "bg-chip text-chip-fg",
  brand: "bg-brand-soft text-brand-ink",
  success: "bg-success-soft text-success",
  warn: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export interface StatBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatBadgeTone;
  dot?: boolean;
}

export function StatBadge({
  tone = "neutral",
  dot,
  className,
  children,
  ...props
}: StatBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[12px] font-bold tracking-wide",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}
