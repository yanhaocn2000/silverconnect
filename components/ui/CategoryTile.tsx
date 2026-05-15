import * as React from "react";
import { cn } from "./cn";

export interface CategoryTileProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  description?: string;
  large?: boolean;
}

export const CategoryTile = React.forwardRef<
  HTMLButtonElement,
  CategoryTileProps
>(({ icon, label, description, large, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "group relative flex flex-col items-start gap-2.5 overflow-hidden",
      "rounded-lg border border-border bg-bg-surface p-[18px] text-left",
      "transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft",
      large ? "min-h-[148px]" : "min-h-[132px]",
      className,
    )}
    {...props}
  >
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-[14px] bg-bg-surface-2 text-2xl",
        large ? "h-12 w-12" : "h-11 w-11",
      )}
    >
      {icon}
    </span>
    <span
      className={cn(
        "font-semibold text-text-primary",
        large ? "text-h3" : "text-body",
      )}
    >
      {label}
    </span>
    {description ? (
      <span className="text-small text-text-secondary">{description}</span>
    ) : null}
  </button>
));
CategoryTile.displayName = "CategoryTile";
