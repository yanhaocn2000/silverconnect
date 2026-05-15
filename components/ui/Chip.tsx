import * as React from "react";
import { cn } from "./cn";

export type ChipTone = "neutral" | "brand" | "success" | "warn" | "danger";

const toneClass: Record<ChipTone, string> = {
  neutral: "bg-chip text-chip-fg",
  brand: "bg-brand-soft text-brand-ink",
  success: "bg-success-soft text-success",
  warn: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
}

export function Chip({ tone = "neutral", className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[13px] font-semibold",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}
