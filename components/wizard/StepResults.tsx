"use client";

import { useState } from "react";
import { CATEGORY_BY_KEY, rm, resolveSpending, buildConditions, buildTips, govtServiceTax } from "@kadcompare/core";
import type { Persona, RecommendationResult, SpendingProfile } from "@kadcompare/core";
import { CardResultCard } from "@/components/results/CardResultCard";
import { FreshnessBadge } from "@/components/results/FreshnessBadge";
import { CardConditionsPanel } from "@/components/results/CardConditionsPanel";
import { TipsPanel } from "@/components/results/TipsPanel";

interface StepResultsProps {
  result: RecommendationResult;
  persona: Persona;
  spending: SpendingProfile;
  onRestart: () => void;
}

type View = "single" | "combo";

export function StepResults({ result, persona, spending, onRestart }: StepResultsProps) {
  const defaultView: View = persona.effortTolerance === "multi" ? "combo" : "single";
  const [view, setView] = useState<View>(defaultView);

  // For the combo view, derive each card's earning conditions from the same
  // resolved spending the engine used.
  const resolved = resolveSpending(spending);
  const totalMonthly = Object.values(resolved).reduce((a, b) => a + b, 0);
  const tips = buildTips(result, spending);

  const { single, combo, ineligible } = result;
  const comboAvailable = combo.members.length > 1;

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Your recommendations</h2>
        <p className="mt-2 text-slate-600">
          Ranked by the real ringgit value they earn on your spending, net of fees.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>Data freshness:</span>
          <span className="font-medium text-emerald-600">🕒 recently verified</span>
          <span className="font-medium text-amber-600">🕒 getting old</span>
          <span className="font-medium text-red-500">⚠ stale — re-check the bank</span>
        </div>
      </header>

      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setView("single")}
            className={[
              "rounded-lg px-5 py-2 text-sm font-semibold transition",
              view === "single" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            ].join(" ")}
          >
            Best single card
          </button>
          <button
            type="button"
            onClick={() => setView("combo")}
            className={[
              "rounded-lg px-5 py-2 text-sm font-semibold transition",
              view === "combo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            ].join(" ")}
          >
            Best combo {comboAvailable ? `(${combo.members.length} cards)` : ""}
          </button>
        </div>
      </div>

      {single.length > 0 && <TipsPanel tips={tips} />}

      {view === "single" && (
        <div className="space-y-4">
          {single.length === 0 && (
            <p className="text-center text-slate-500">
              No eligible cards for your income bracket. Try adjusting your answers.
            </p>
          )}
          {single.slice(0, 5).map((s, i) => (
            <CardResultCard key={s.card.id} score={s} rank={i + 1} highlight={i === 0} />
          ))}
        </div>
      )}

      {view === "combo" && (
        <div className="space-y-4">
          {!comboAvailable ? (
            <div className="rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-600">
              For your spending, a single card is hard to beat — adding more cards
              wouldn&apos;t earn enough to justify it. Here&apos;s that card:
            </div>
          ) : (
            <div className="rounded-2xl border border-brand-dark/30 bg-brand/5 p-4 text-center">
              <div className="text-sm text-slate-600">
                This {combo.members.length}-card combo earns about
              </div>
              <div className="text-3xl font-bold text-brand-dark">
                {rm(combo.netAnnualRM)}
                <span className="text-base font-medium text-slate-500"> / year</span>
              </div>
              <div className="text-xs text-slate-500">
                net of {rm(combo.totalAnnualFee)} in annual fees + {rm(combo.totalGovtTaxRM)}{" "}
                government service tax across {combo.members.length} card
                {combo.members.length === 1 ? "" : "s"}
              </div>
            </div>
          )}

          {(comboAvailable ? combo.members : single.slice(0, 1).map((s) => ({
            card: s.card,
            assignedCategories: s.breakdown.map((b) => b.category),
            contributionRM: s.netAnnualRM,
          }))).map((m) => (
            <article
              key={m.card.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-stretch">
                <div className="w-2 shrink-0" style={{ backgroundColor: m.card.color }} aria-hidden />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{m.card.name}</h3>
                      <p className="text-sm text-slate-500">
                        {m.card.bank} · {m.card.network}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-brand-dark">
                        {rm(m.contributionRM)}
                      </div>
                      <div className="text-xs text-slate-500">/ year</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Use this card for
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.assignedCategories.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                        >
                          {CATEGORY_BY_KEY[c].icon} {CATEGORY_BY_KEY[c].label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <CardConditionsPanel conditions={buildConditions(m.card, resolved, totalMonthly)} />
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">+{rm(govtServiceTax(m.card))} govt tax/yr</span>
                    <FreshnessBadge date={m.card.lastVerified} href={m.card.sourceUrl} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {ineligible.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-medium text-slate-700">
            {ineligible.length} card{ineligible.length === 1 ? "" : "s"} hidden (income
            requirement not met)
          </summary>
          <ul className="mt-2 space-y-1 text-slate-500">
            {ineligible.map((c) => (
              <li key={c.id}>
                {c.name} — needs {rm(c.minAnnualIncome)}/year
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mx-auto max-w-xl text-center text-xs text-slate-400">
        Card terms were last verified mid-2026 from credible public sources and carry a
        confidence rating — most are <span className="text-amber-600">medium confidence</span>,
        so always confirm current terms with the bank before applying. Estimates only, not
        financial advice.
      </p>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
        >
          ↺ Start over
        </button>
      </div>
    </div>
  );
}
