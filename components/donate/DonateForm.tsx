"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import type { DonateLocale } from "@/lib/donations/schema";

type Mode = "once" | "monthly";
const PRESETS = [25, 50, 100, 250] as const;
const MAX_DOLLARS = 50_000;

export function DonateForm({ locale }: { locale: DonateLocale }) {
  const t = useTranslations("donate.form");
  const [mode, setMode] = React.useState<Mode>("once");
  const [amount, setAmount] = React.useState<number>(50);
  const [custom, setCustom] = React.useState<string>("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [anon, setAnon] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const validAmount = amount > 0 && amount <= MAX_DOLLARS;
  const overLimit = amount > MAX_DOLLARS;

  const hint = React.useMemo(() => {
    if (overLimit) return t("overLimit");
    if (!validAmount) return t("pickAmount");
    const key = String(amount);
    const presetHint = (
      ["25", "50", "100", "250"] as const
    ).includes(key as "25" | "50" | "100" | "250")
      ? t(`amounts.${key as "25" | "50" | "100" | "250"}`)
      : null;
    return presetHint ?? t("amounts.other", { amount });
  }, [amount, overLimit, validAmount, t]);

  const submitLabel = mode === "monthly"
    ? t("submitMonthly", { amount })
    : t("submitOnce", { amount });

  function pickPreset(v: number) {
    setAmount(v);
    setCustom("");
  }
  function onCustomChange(v: string) {
    setCustom(v);
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) setAmount(Math.floor(n));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validAmount) {
      setError(t("pickAmount"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/donate/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amountCents: Math.round(amount * 100),
          currency: "aud",
          mode,
          locale,
          donor: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || undefined,
            message: message.trim() || undefined,
          },
          isAnonymous: anon,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || t("errorGeneric"));
      }
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg bg-bg-surface border border-border shadow-card p-6 md:p-10">
      {/* once/monthly toggle */}
      <div className="inline-flex p-1 rounded-full bg-bg-surface-2 border border-border text-sm font-semibold">
        <ModeBtn active={mode === "once"} onClick={() => setMode("once")}>
          {t("once")}
        </ModeBtn>
        <ModeBtn active={mode === "monthly"} onClick={() => setMode("monthly")}>
          {t("monthly")}
        </ModeBtn>
      </div>

      {/* presets */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {PRESETS.map((v) => {
          const active = amount === v && custom === "";
          return (
            <button
              key={v}
              type="button"
              aria-pressed={active}
              onClick={() => pickPreset(v)}
              className={cn(
                "min-h-touch-btn rounded-md border-2 bg-bg-surface font-bold text-[20px] transition",
                active
                  ? "border-brand text-brand bg-brand-soft"
                  : "border-border hover:border-brand",
              )}
            >
              ${v}
            </button>
          );
        })}
      </div>

      <p
        className={cn(
          "mt-3 text-sm",
          overLimit ? "text-danger" : "text-text-tertiary",
        )}
      >
        {hint}
      </p>

      <div className="mt-4">
        <label htmlFor="custom" className="text-sm font-semibold text-text-secondary">
          {t("customLabel")}
        </label>
        <div className="mt-2 flex items-center rounded-md border-2 border-border focus-within:border-brand bg-bg-surface overflow-hidden">
          <span className="pl-4 text-text-tertiary font-bold">$</span>
          <input
            id="custom"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder={t("customPlaceholder")}
            value={custom}
            onChange={(e) => onCustomChange(e.target.value)}
            className="flex-1 min-h-touch-btn px-3 text-[18px] font-semibold focus:outline-none bg-transparent"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Field id="name" label={t("nameLabel")} required value={name} onChange={setName} />
          <Field
            id="email"
            type="email"
            label={t("emailLabel")}
            placeholder={t("emailHint")}
            required
            value={email}
            onChange={setEmail}
          />
        </div>
        <Field id="phone" type="tel" label={t("phoneLabel")} value={phone} onChange={setPhone} />
        <div>
          <label htmlFor="message" className="text-sm font-semibold text-text-secondary">
            {t("messageLabel")}
          </label>
          <textarea
            id="message"
            rows={3}
            placeholder={t("messagePlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 w-full px-4 py-3 rounded-md border-2 border-border focus:border-brand focus:outline-none bg-bg-surface"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-text-secondary select-none">
          <input
            type="checkbox"
            className="w-4 h-4 accent-brand"
            checked={anon}
            onChange={(e) => setAnon(e.target.checked)}
          />
          {t("anonymous")}
        </label>

        <button
          type="submit"
          disabled={submitting || !validAmount}
          aria-busy={submitting}
          className={cn(
            "mt-3 min-h-touch-btn rounded-md bg-brand text-white font-semibold text-[18px] shadow-sm transition",
            "hover:bg-brand-hover active:scale-[0.97]",
            "disabled:opacity-70 disabled:cursor-not-allowed",
          )}
        >
          {submitting ? t("submitting") : submitLabel}
        </button>
        {!validAmount && !overLimit && (
          <p className="text-text-tertiary text-sm">{t("pickAmount")}</p>
        )}
        {error && (
          <p role="alert" className="text-danger text-sm">
            ⚠ {error}
          </p>
        )}
      </form>

      <div className="mt-7 pt-6 border-t border-border">
        <div className="text-xs text-text-tertiary mb-3">{t("paymentLabel")}</div>
        <div className="flex flex-wrap items-center gap-3 opacity-70">
          {["Stripe", "PayPal", "WeChat Pay", "Alipay"].map((p) => (
            <div
              key={p}
              className="px-3 py-1.5 rounded-md border border-border bg-bg-surface text-sm font-semibold"
            >
              {p}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-text-tertiary leading-relaxed">{t("paymentNote")}</p>
      </div>
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-touch px-6 rounded-full transition",
        active ? "bg-brand text-white" : "text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full min-h-touch px-4 rounded-md border-2 border-border focus:border-brand focus:outline-none bg-bg-surface"
      />
    </div>
  );
}
