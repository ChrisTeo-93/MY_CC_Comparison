"use client";

import { useState } from "react";
import type { CardConditions, EarnCondition } from "@kadcompare/core";
import { rm } from "@kadcompare/core";

/**
 * Expandable "How you earn this" panel — spells out the spend thresholds and caps
 * behind each reward in plain language, and checks them against the user's own
 * spending. The whole point: show the effort to earn, not just the final number.
 */
export function CardConditionsPanel({ conditions }: { conditions: CardConditions }) {
  const [open, setOpen] = useState(false);
  const { earn, fee, baseRateLabel, yourMonthlyTotalRM } = conditions;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 text-sm font-semibold text-brand-dark hover:underline"
      >
        {open ? "Hide the conditions" : "How you earn this"}
        <span className="text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">
            Based on about <span className="font-medium text-slate-700">{rm(yourMonthlyTotalRM)}/month</span>{" "}
            total spend from your answers.
          </p>

          {earn.length === 0 ? (
            <p className="text-sm text-slate-600">
              Flat {baseRateLabel} on everything — no spend thresholds to worry about.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {earn.map((c, i) => (
                <EarnRow key={i} c={c} totalMonthly={yourMonthlyTotalRM} />
              ))}
            </ul>
          )}

          <div className="space-y-1 border-t border-slate-200 pt-2 text-sm">
            <p className="text-slate-600">
              <span className="text-slate-400">Everything else earns</span> {baseRateLabel}.
            </p>
            <p className={fee.met ? "text-emerald-700" : "text-amber-700"}>
              {fee.met ? "✓ " : "• "}
              {fee.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function EarnRow({ c, totalMonthly }: { c: EarnCondition; totalMonthly: number }) {
  const status = !c.unlocked
    ? { label: "Locked", cls: "bg-amber-100 text-amber-700" }
    : c.hitsCap
      ? { label: "You max this", cls: "bg-emerald-100 text-emerald-700" }
      : { label: "Active", cls: "bg-emerald-100 text-emerald-700" };

  const shortfall = c.minTotalSpendRM ? Math.max(0, c.minTotalSpendRM - totalMonthly) : 0;

  return (
    <li className="rounded-lg bg-white p-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">
          {c.rateLabel} · {c.label}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <p className="mt-1 text-sm text-slate-600">
        {c.maxMonthlyRewardRM !== undefined && c.spendToMaxRM !== undefined ? (
          <>
            Earn up to <span className="font-semibold text-slate-800">{rm(c.maxMonthlyRewardRM)}/mo</span> back — spend
            about <span className="font-semibold text-slate-800">{rm(c.spendToMaxRM)}/mo</span> on{" "}
            {c.label.toLowerCase()} to max it out.
          </>
        ) : c.maxMonthlyRewardRM !== undefined ? (
          <>
            Earn up to <span className="font-semibold text-slate-800">{rm(c.maxMonthlyRewardRM)}/mo</span> back.
          </>
        ) : (
          <>No monthly cap on this rate.</>
        )}
      </p>

      {c.minTotalSpendRM !== undefined && (
        <p className="mt-1 text-xs">
          {c.unlocked ? (
            <span className="text-emerald-700">
              ✓ Unlocked — needs {rm(c.minTotalSpendRM)}/mo total spend, and you&apos;re at {rm(totalMonthly)}.
            </span>
          ) : (
            <span className="text-amber-700">
              ✗ Needs {rm(c.minTotalSpendRM)}/mo total spend to activate — you&apos;re at {rm(totalMonthly)}, about{" "}
              {rm(shortfall)} short.
            </span>
          )}
        </p>
      )}

      {c.category === "general" && (
        <p className="mt-1 text-xs">
          {c.excludedLabels && c.excludedLabels.length > 0 ? (
            <span className="text-amber-700">
              ⊘ Excludes {c.excludedLabels.join(", ")} — spend there earns only the base rate, not
              this bonus.
            </span>
          ) : (
            <span className="text-emerald-700">✓ Applies to any transaction — no exclusions.</span>
          )}
        </p>
      )}

      {c.note && <p className="mt-1 text-xs text-slate-400">{c.note}</p>}
    </li>
  );
}
