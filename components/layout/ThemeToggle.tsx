"use client";

import * as React from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { cn } from "@/components/ui/cn";

type ThemeOption = "light" | "dark" | "system";

const OPTIONS: { value: ThemeOption; Icon: typeof Sun }[] = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
];

/**
 * Theme switcher: a single icon button (showing the *resolved* theme) that
 * opens a dropdown with light / dark / system. Icon-only on every breakpoint
 * to stay compact in the already-crowded header — the menu items carry the
 * text labels and the trigger has an aria-label.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("theme");
  const { theme, resolvedTheme, setTheme } = useTheme();
  // next-themes' documented "avoid hydration mismatch" pattern: theme is
  // unknown on the server, so we render a neutral icon until mounted.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    // eslint-disable-next-line -- one-shot mount flag; cascading-render rule N/A
    setMounted(true);
  }, []);

  // Before mount the theme is unknown (SSR has no localStorage); render a
  // neutral placeholder to avoid a hydration mismatch on the icon.
  const TriggerIcon = !mounted
    ? Monitor
    : resolvedTheme === "dark"
      ? Moon
      : Sun;
  const current = (mounted ? (theme as ThemeOption | undefined) : undefined) ?? "system";

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        aria-label={t("toggle")}
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center rounded-md border-[1.5px] border-border bg-bg-surface text-text-primary hover:border-brand hover:text-brand",
          className,
        )}
      >
        <TriggerIcon size={18} aria-hidden />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[160px] rounded-md border border-border bg-bg-surface p-1 shadow-popover"
        >
          {OPTIONS.map(({ value, Icon }) => (
            <Dropdown.Item
              key={value}
              onSelect={() => setTheme(value)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-body text-text-primary outline-none hover:bg-bg-surface focus:bg-bg-surface",
                current === value && "bg-bg-surface-2 font-semibold",
              )}
            >
              <Icon size={16} aria-hidden />
              <span className="flex-1">{t(value)}</span>
              {current === value && <Check size={14} aria-hidden className="text-brand" />}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
