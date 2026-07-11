import type { MaxTip } from "@kadcompare/core";
import { rm } from "@kadcompare/core";

/**
 * "Maximize your gains" callout — actionable moves to capture more from the
 * recommended cards, chiefly routing cap-overflow spend onto a second card.
 */
export function TipsPanel({ tips }: { tips: MaxTip[] }) {
  if (tips.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
        ✓ Your recommended cards already capture your spend efficiently — no category is
        overflowing its cap, so nothing is going to waste.
      </div>
    );
  }

  const totalGain = tips.reduce((sum, t) => sum + t.annualGainRM, 0);

  return (
    <div className="rounded-2xl border border-brand-dark/30 bg-brand/5 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">💡 Maximize your gains</h3>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          up to +{rm(totalGain)}/yr
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Small ways to use your recommended cards together so no spend is wasted.
      </p>
      <ul className="mt-4 space-y-3">
        {tips.map((t, i) => (
          <li key={i} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">{t.title}</span>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                +{rm(t.annualGainRM)}/yr
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{t.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">
        Estimates based on your inputs and current cap/threshold data. Worth it only if the
        extra admin suits you.
      </p>
    </div>
  );
}
