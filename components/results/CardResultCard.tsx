import { CATEGORY_BY_KEY } from "@/lib/domain/categories";
import type { CardScore } from "@/lib/domain/types";
import { rm } from "@/lib/format";
import { FreshnessBadge, ConfidenceChip } from "@/components/results/FreshnessBadge";

interface CardResultCardProps {
  score: CardScore;
  rank: number;
  highlight?: boolean;
}

const REWARD_LABEL: Record<string, string> = {
  cashback: "Cashback",
  points: "Points",
  miles: "Miles",
  hybrid: "Hybrid",
};

export function CardResultCard({ score, rank, highlight }: CardResultCardProps) {
  const { card } = score;
  const topCategories = [...score.breakdown]
    .filter((b) => b.annualValueRM > 0)
    .sort((a, b) => b.annualValueRM - a.annualValueRM)
    .slice(0, 3);

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border bg-white shadow-sm",
        highlight ? "border-brand-dark ring-2 ring-brand/30" : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-stretch">
        <div className="w-2 shrink-0" style={{ backgroundColor: card.color }} aria-hidden />
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                {highlight && (
                  <span className="rounded-full bg-brand-dark px-2 py-0.5 text-xs font-semibold text-white">
                    Best match
                  </span>
                )}
                <span className="text-xs font-medium text-slate-400">#{rank}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{card.name}</h3>
                <ConfidenceChip level={card.confidence} note={card.dataNote} />
              </div>
              <p className="text-sm text-slate-500">
                {card.bank} · {card.network} · {REWARD_LABEL[card.rewardType]}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-brand-dark">
                {rm(score.netAnnualRM)}
              </div>
              <div className="text-xs text-slate-500">net value / year</div>
            </div>
          </div>

          <ul className="mt-4 space-y-1">
            {score.reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-brand-dark">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>

          {topCategories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {topCategories.map((b) => (
                <span
                  key={b.category}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                >
                  {CATEGORY_BY_KEY[b.category].icon} {CATEGORY_BY_KEY[b.category].label}:{" "}
                  <span className="font-semibold text-slate-800">{rm(b.annualValueRM)}</span>
                  {b.capped && <span className="text-amber-600"> (capped)</span>}
                </span>
              ))}
            </div>
          )}

          {card.dataNote && card.confidence !== "high" && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⓘ {card.dataNote}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-500">
              {card.annualFee === 0
                ? "No annual fee"
                : score.effectiveAnnualFee === 0
                  ? `Annual fee RM${card.annualFee} (waived)`
                  : `Annual fee RM${card.annualFee}`}
            </span>
            <FreshnessBadge date={card.lastVerified} href={card.sourceUrl} />
          </div>
        </div>
      </div>
    </article>
  );
}
