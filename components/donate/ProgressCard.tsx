import { getTranslations } from "next-intl/server";
import { ProgressBar } from "./ProgressBar";

interface Props {
  raisedCents: number;
  goalCents: number;
  donorCount: number;
  /** Optional fixed extras shown in the small grid; demo defaults below if undefined. */
  avgCents?: number;
  communities?: number;
  daysLeft?: number;
}

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

export async function ProgressCard({
  raisedCents,
  goalCents,
  donorCount,
  avgCents,
  communities = 12,
  daysLeft = 23,
}: Props) {
  const t = await getTranslations("donate.progress");
  const pct = goalCents > 0 ? Math.round((raisedCents / goalCents) * 100) : 0;
  const avg = avgCents ?? (donorCount > 0 ? Math.round(raisedCents / donorCount) : 0);
  return (
    <div className="bg-bg-surface rounded-lg shadow-card border border-border p-7">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm text-text-tertiary">{t("raised")}</div>
          <div className="text-[32px] font-extrabold tracking-tight">
            <span className="text-brand">{fmtMoney(raisedCents)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-text-tertiary">{t("goal")}</div>
          <div className="text-[20px] font-bold text-text-secondary">
            {fmtMoney(goalCents)}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <ProgressBar pct={pct} />
      </div>
      <div className="mt-2 text-sm text-text-tertiary flex justify-between">
        <span>{t("percentComplete", { pct })}</span>
        <span dangerouslySetInnerHTML={{ __html: t.raw("daysLeft").replace("{days}", String(daysLeft)) }} />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <Stat value={donorCount.toLocaleString("en-AU")} label={t("donors")} />
        <Stat value={fmtMoney(avg)} label={t("avg")} />
        <Stat value={String(communities)} label={t("communities")} />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-bg-surface p-3">
      <div className="text-[20px] font-bold">{value}</div>
      <div className="text-xs text-text-tertiary mt-1">{label}</div>
    </div>
  );
}
