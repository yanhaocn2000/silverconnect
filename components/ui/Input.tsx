import * as React from "react";
import { cn } from "./cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "block w-full min-h-touch-btn rounded-md bg-bg-surface px-4 text-body text-text-primary",
        "border-[1.5px] border-border placeholder:text-text-placeholder",
        "focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand-soft",
        invalid && "border-danger focus:border-danger focus:ring-danger-soft",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
