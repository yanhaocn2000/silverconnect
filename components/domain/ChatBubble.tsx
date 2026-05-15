import * as React from "react";
import { cn } from "@/components/ui/cn";
import { C9AICompanion } from "@/components/illustrations";

export function ChatBubble({
  who,
  children,
}: {
  who: "ai" | "me";
  children: React.ReactNode;
}) {
  const me = who === "me";
  return (
    <div
      className={cn(
        "flex max-w-[85%] items-end gap-2",
        me ? "self-end" : "self-start"
      )}
    >
      {!me && <C9AICompanion size={36} />}
      <div
        className={cn(
          "px-3.5 py-2.5 text-[15px] leading-snug",
          me
            ? "rounded-[18px_18px_4px_18px] bg-brand text-white"
            : "rounded-[4px_18px_18px_18px] border border-border bg-bg-surface text-text-primary"
        )}
      >
        {children}
      </div>
    </div>
  );
}
