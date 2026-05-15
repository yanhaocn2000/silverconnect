"use client";

import * as React from "react";
import * as RadioPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "./cn";

export const RadioGroup = RadioPrimitive.Root;

export const RadioItem = React.forwardRef<
  React.ElementRef<typeof RadioPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioPrimitive.Item
    ref={ref}
    className={cn(
      "inline-flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-border bg-bg-surface",
      "data-[state=checked]:border-brand",
      className
    )}
    {...props}
  >
    <RadioPrimitive.Indicator>
      <Circle size={12} className="fill-brand text-brand" aria-hidden />
    </RadioPrimitive.Indicator>
  </RadioPrimitive.Item>
));
RadioItem.displayName = "RadioItem";
