import * as React from "react";
import { cn } from "./cn";

export const DottedCTA = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex w-full items-center justify-center gap-2 rounded-md p-4",
      "border-[1.5px] border-dashed border-border-strong bg-transparent",
      "text-small font-semibold text-text-secondary",
      "hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft",
      className,
    )}
    {...props}
  >
    {children}
  </button>
));
DottedCTA.displayName = "DottedCTA";
