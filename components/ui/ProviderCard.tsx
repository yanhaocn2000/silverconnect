import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "./cn";

export interface ProviderCardProps extends React.HTMLAttributes<HTMLDivElement> {
  avatar: React.ReactNode;
  name: string;
  service: string;
  rating?: number;
  reviewCount?: number;
  price?: string;
  trailing?: React.ReactNode;
}

export function ProviderCard({
  avatar,
  name,
  service,
  rating,
  reviewCount,
  price,
  trailing,
  className,
  ...props
}: ProviderCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3.5 rounded-lg border border-border bg-bg-surface p-4",
        className,
      )}
      {...props}
    >
      <div className="shrink-0">{avatar}</div>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-text-primary text-body">
            {name}
          </span>
          {price ? (
            <span className="font-bold text-text-primary text-body tabular-nums">
              {price}
            </span>
          ) : null}
        </div>
        <span className="text-small text-text-secondary">{service}</span>
        {typeof rating === "number" ? (
          <span className="inline-flex items-center gap-1 text-small text-text-secondary">
            <Star size={14} aria-hidden className="fill-current text-brand" />
            <span className="font-semibold text-text-primary tabular-nums">
              {rating.toFixed(1)}
            </span>
            {typeof reviewCount === "number" ? (
              <span className="text-text-tertiary">({reviewCount})</span>
            ) : null}
          </span>
        ) : null}
        {trailing}
      </div>
    </div>
  );
}
