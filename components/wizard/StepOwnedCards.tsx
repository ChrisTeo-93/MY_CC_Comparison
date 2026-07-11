"use client";

import { ACTIVE_CARDS } from "@kadcompare/core";

const REWARD_LABEL: Record<string, string> = {
  cashback: "Cashback",
  points: "Points",
  miles: "Miles",
  hybrid: "Hybrid",
};

interface StepOwnedCardsProps {
  owned: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function StepOwnedCards({ owned, onToggle, onBack, onSubmit }: StepOwnedCardsProps) {
  const set = new Set(owned);

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Which cards do you already have?</h2>
        <p className="mt-2 text-slate-600">
          Pick the credit cards you currently hold. We&apos;ll show what you&apos;re earning, whether
          you&apos;re using them right, and where you can do better.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {ACTIVE_CARDS.map((card) => {
          const on = set.has(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onToggle(card.id)}
              aria-pressed={on}
              className={[
                "flex items-stretch overflow-hidden rounded-xl border text-left transition",
                on ? "border-brand-dark ring-1 ring-brand-dark" : "border-slate-200 hover:border-brand",
              ].join(" ")}
            >
              <span className="w-1.5 shrink-0" style={{ backgroundColor: card.color }} aria-hidden />
              <span className="flex flex-1 items-center justify-between gap-2 p-3">
                <span>
                  <span className="block font-medium text-slate-900">{card.name}</span>
                  <span className="block text-xs text-slate-500">
                    {card.bank} · {REWARD_LABEL[card.rewardType]}
                  </span>
                </span>
                <span
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs text-white",
                    on ? "border-brand-dark bg-brand-dark" : "border-slate-300",
                  ].join(" ")}
                >
                  {on ? "✓" : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-5 py-3 font-semibold text-slate-600 transition hover:text-slate-900"
        >
          ← Back
        </button>
        <button
          type="button"
          disabled={owned.length === 0}
          onClick={onSubmit}
          className="rounded-lg bg-brand-dark px-6 py-3 font-semibold text-white transition enabled:hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          Evaluate my {owned.length || ""} card{owned.length === 1 ? "" : "s"} →
        </button>
      </div>
    </div>
  );
}
