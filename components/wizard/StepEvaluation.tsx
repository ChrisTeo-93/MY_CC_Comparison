"use client";

import Link from "next/link";
import type { Evaluation } from "@kadcompare/core";
import { rm } from "@kadcompare/core";
import { CardResultCard } from "@/components/results/CardResultCard";
import { TipsPanel } from "@/components/results/TipsPanel";

interface StepEvaluationProps {
  evaluation: Evaluation;
  onRestart: () => void;
}

export function StepEvaluation({ evaluation, onRestart }: StepEvaluationProps) {
  const {
    ownedScores,
    currentNetAnnualRM,
    bestNetAnnualRM,
    upsideAnnualRM,
    suggestions,
    tips,
    alreadyOptimal,
  } = evaluation;

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Your current cards, evaluated</h2>
        <p className="mt-2 text-slate-600">
          What your {ownedScores.length} card{ownedScores.length === 1 ? "" : "s"} earn on your
          spending — and where there&apos;s more to capture.
        </p>
      </header>

      {/* Headline: current earnings */}
      <div className="rounded-2xl border border-brand-dark/30 bg-brand/5 p-6 text-center">
        <div className="text-sm text-slate-600">Using your cards optimally, you earn about</div>
        <div className="text-4xl font-bold text-brand-dark">
          {rm(currentNetAnnualRM)}
          <span className="text-base font-medium text-slate-500"> / year</span>
        </div>

        {alreadyOptimal ? (
          <p className="mx-auto mt-3 max-w-md rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            🎉 You&apos;re already on the best setup for your spending — no card we list would
            meaningfully beat what you hold.
          </p>
        ) : (
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">
            The best possible setup for your spending earns{" "}
            <span className="font-semibold text-slate-900">{rm(bestNetAnnualRM)}/yr</span> — you&apos;re
            leaving about{" "}
            <span className="font-semibold text-amber-700">{rm(upsideAnnualRM)}/yr</span> on the table.
          </p>
        )}
      </div>

      {/* Use them better */}
      {tips.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900">Get more from what you have</h3>
          <TipsPanel tips={tips} />
        </section>
      )}

      {/* Per-card breakdown */}
      <section className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900">What each card earns you</h3>
        <div className="space-y-4">
          {ownedScores.map((s, i) => (
            <CardResultCard key={s.card.id} score={s} rank={i + 1} highlight={i === 0} />
          ))}
        </div>
      </section>

      {/* Add-a-card suggestions */}
      {suggestions.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-slate-900">Adding one of these would earn you more</h3>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <a
                key={s.card.id}
                href={s.card.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand"
              >
                <span className="flex items-center gap-3">
                  <span className="h-8 w-1.5 rounded" style={{ backgroundColor: s.card.color }} aria-hidden />
                  <span>
                    <span className="block font-medium text-slate-900">{s.card.name}</span>
                    <span className="block text-xs text-slate-500">{s.card.bank}</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  +{rm(s.addedAnnualRM)}/yr
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-slate-400">
        Estimates based on your inputs and current card data. Owned cards are evaluated regardless of
        income (you already hold them); suggested cards respect their income requirements.
      </p>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/recommend"
          className="text-sm font-semibold text-brand-dark hover:underline"
        >
          Or find your best card from scratch →
        </Link>
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
