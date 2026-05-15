"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "./cn";

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Right-side action (e.g. mic / filter button) */
  trailing?: React.ReactNode;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, trailing, ...props }, ref) => (
    <label
      className={cn(
        "flex h-14 items-center gap-3 rounded-2xl border-[1.5px] border-border bg-bg-surface px-4",
        "text-text-tertiary focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-soft",
        className,
      )}
    >
      <Search size={20} aria-hidden className="shrink-0" />
      <input
        ref={ref}
        type="search"
        className="flex-1 border-0 bg-transparent text-body text-text-primary outline-none placeholder:text-text-tertiary"
        {...props}
      />
      {trailing}
    </label>
  ),
);
SearchBar.displayName = "SearchBar";
