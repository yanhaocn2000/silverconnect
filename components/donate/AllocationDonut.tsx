import { getTranslations } from "next-intl/server";

const COLORS = ["#1858C4", "#F59E0B", "#15803D", "#7C3AED", "#64748B"];

export async function AllocationDonut() {
  const t = await getTranslations("donate.allocation");
  // i18n returns the items array; cast to typed shape.
  const items = (t.raw("items") as Array<{ label: string; pct: number }>) ?? [];

  // Stripe-style donut: stroke-dasharray + stroke-dashoffset accumulator.
  // Compute imperatively into a fresh array (React 19 forbids mutating
  // captured `let` inside .map during render).
  const segments: Array<{
    label: string;
    pct: number;
    dasharray: string;
    dashoffset: number;
    color: string;
  }> = [];
  let offset = 25; // 25% of-circumference rotation puts segment 1 at 12 o'clock
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    segments.push({
      label: item.label,
      pct: item.pct,
      dasharray: `${item.pct} ${100 - item.pct}`,
      dashoffset: offset,
      color: COLORS[i % COLORS.length]!,
    });
    offset = (((offset - item.pct) % 100) + 100) % 100;
  }

  return (
    <section
      id="allocation"
      className="bg-bg-surface border-y border-border"
    >
      <div className="max-w-6xl mx-auto px-5 py-16 md:py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-sm font-semibold text-brand uppercase tracking-wider">
            {t("eyebrow")}
          </div>
          <h2 className="text-h2 md:text-h1 font-extrabold tracking-tight mt-2">
            {t("title")}
          </h2>
          <div className="mt-8 space-y-6">
            <Block icon="💙" color="blue" title={t("block1Title")} body={t("block1Body")} />
            <Block icon="⏳" color="amber" title={t("block2Title")} body={t("block2Body")} />
            <Block icon="🌱" color="green" title={t("block3Title")} body={t("block3Body")} />
          </div>
        </div>
        <div className="rounded-lg bg-bg-surface border border-border shadow-card p-8">
          <div className="flex items-center justify-center">
            <svg
              role="img"
              aria-labelledby="donut-title donut-desc"
              viewBox="0 0 42 42"
              width="260"
              height="260"
            >
              <title id="donut-title">{t("title")}</title>
              <desc id="donut-desc">
                {segments.map((s) => `${s.label} ${s.pct}%`).join("; ")}
              </desc>
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="var(--bg-base)"
                stroke="var(--bg-surface-2)"
                strokeWidth="6"
              />
              {segments.map((s, i) => (
                <circle
                  key={i}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth="6"
                  strokeDasharray={s.dasharray}
                  strokeDashoffset={s.dashoffset}
                  transform="rotate(-90 21 21)"
                />
              ))}
              <text
                x="21"
                y="20"
                textAnchor="middle"
                fontSize="4"
                fontWeight="800"
                fill="var(--text-primary)"
              >
                95%
              </text>
              <text x="21" y="25" textAnchor="middle" fontSize="2.4" fill="var(--text-tertiary)">
                {t("centerLabel")}
              </text>
            </svg>
          </div>
          <ul className="mt-6 space-y-3 text-sm">
            {segments.map((s, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
                <b>{s.pct}%</b>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-text-tertiary leading-relaxed">{t("footnote")}</p>
        </div>
      </div>
    </section>
  );
}

function Block({
  icon,
  color,
  title,
  body,
}: {
  icon: string;
  color: "blue" | "amber" | "green";
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4">
      <div
        className="w-12 h-12 rounded-md flex items-center justify-center text-xl shrink-0"
        style={{ background: `var(--chip-${color}-bg)`, color: `var(--chip-${color}-fg)` }}
        aria-hidden
      >
        {icon}
      </div>
      <div>
        <div className="font-bold text-body">{title}</div>
        <p className="text-text-secondary mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
