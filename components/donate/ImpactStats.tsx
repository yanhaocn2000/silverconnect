import { getTranslations } from "next-intl/server";

type ChipColor = "blue" | "amber" | "green" | "purple";

interface Tile {
  emoji: string;
  color: ChipColor;
  value: string;
  labelKey: "seniorsServed" | "visits" | "cities" | "volunteers";
}

const TILES: Tile[] = [
  { emoji: "👵", color: "blue", value: "8,640+", labelKey: "seniorsServed" },
  { emoji: "🏠", color: "amber", value: "52,300", labelKey: "visits" },
  { emoji: "📍", color: "green", value: "12", labelKey: "cities" },
  { emoji: "🤝", color: "purple", value: "1,150", labelKey: "volunteers" },
];

export async function ImpactStats() {
  const t = await getTranslations("donate.impact");
  return (
    <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
      <div className="text-center mb-12">
        <div className="text-sm font-semibold text-brand uppercase tracking-wider">
          {t("eyebrow")}
        </div>
        <h2 className="text-h2 md:text-h1 font-extrabold tracking-tight mt-2">
          {t("title")}
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TILES.map((tile) => (
          <div
            key={tile.labelKey}
            className="rounded-lg bg-bg-surface border border-border shadow-card p-6"
          >
            <div
              className="w-12 h-12 rounded-md flex items-center justify-center text-2xl"
              style={{
                background: `var(--chip-${tile.color}-bg)`,
                color: `var(--chip-${tile.color}-fg)`,
              }}
            >
              {tile.emoji}
            </div>
            <div className="mt-4 text-[28px] font-extrabold">{tile.value}</div>
            <div className="text-sm text-text-tertiary mt-1">{t(tile.labelKey)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
