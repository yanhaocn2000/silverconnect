import * as React from "react";
import { cn } from "./cn";

export type BannerTone = "info" | "warn" | "success" | "danger";

const toneClass: Record<BannerTone, string> = {
  info: "bg-brand-soft text-brand-ink",
  warn: "bg-warning-soft text-warning border border-warning/30",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger border border-danger/30",
};

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: BannerTone;
  icon?: React.ReactNode;
}

export function Banner({
  tone = "info",
  icon,
  className,
  children,
  ...props
}: BannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md px-4 py-3 text-small",
        toneClass[tone],
        className,
      )}
      role={tone === "danger" || tone === "warn" ? "alert" : undefined}
      {...props}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="flex-1">{children}</div>
    </div>
  );
}
