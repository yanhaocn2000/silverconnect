"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import type { BookingStatus } from "./BookingStatusBadge";

const FLOW_KEYS = ["booked", "confirmed", "inProgress", "completed"] as const;
type FlowKey = (typeof FLOW_KEYS)[number];

const STATUS_INDEX: Record<BookingStatus, number | -1> = {
  pending: 0,
  confirmed: 1,
  inProgress: 2,
  awaitingConfirm: 2,
  completed: 3,
  cancelledFull: -1,
  cancelledPartial: -1,
  refunded: -1,
};

export function BookingTimeline({ status }: { status: BookingStatus }) {
  const t = useTranslations("booking.timeline");
  const cancelled = STATUS_INDEX[status] === -1;
  const currentIdx = STATUS_INDEX[status];

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      {FLOW_KEYS.map((key, i) => {
        const done = !cancelled && i <= currentIdx;
        const isCurrent = !cancelled && i === currentIdx;
        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-3 py-2.5",
              i > 0 && "border-t border-border"
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
                cancelled && "bg-bg-surface-2",
                !cancelled && isCurrent && "bg-brand",
                !cancelled && !isCurrent && done && "bg-success",
                !cancelled && !done && "bg-bg-surface-2"
              )}
            >
              {done ? (
                <Check size={16} strokeWidth={3} aria-hidden />
              ) : (
                <span className="h-2 w-2 rounded-full bg-text-tertiary" aria-hidden />
              )}
            </span>
            <span
              className={cn(
                "text-[15px]",
                cancelled && "text-text-tertiary",
                !cancelled && isCurrent && "font-bold text-text-primary",
                !cancelled && !isCurrent && done && "text-text-primary",
                !cancelled && !done && "text-text-tertiary"
              )}
            >
              {t(key as FlowKey)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
