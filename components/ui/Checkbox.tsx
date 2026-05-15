"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "./cn";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-6 w-6 items-center justify-center rounded-sm border-[1.5px] border-border bg-bg-surface",
      "data-[state=checked]:border-brand data-[state=checked]:bg-brand",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <Check size={18} className="text-white" aria-hidden />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
