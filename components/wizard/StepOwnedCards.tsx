"use client";

import { useMemo, useState } from "react";
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

const ALL_BANKS = "__all__";

export function StepOwnedCards({ owned, onToggle, onBack, onSubmit }: StepOwnedCardsProps) {
  const set = new Set(owned);
  const [query, setQuery] = useState("");
  const [bank, setBank] = useState<string>(ALL_BANKS);

  // Banks in stable, alphabetical order for the filter chips.
  const banks = useMemo(
    () => Array.from(new Set(ACTIVE_CARDS.map((c) => c.bank))).sort((a, b) => a.localeCompare(b)),
    [],
  );

  // Filter by the active bank chip + free-text search (name or bank).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACTIVE_CARDS.filter((c) => {
      if (bank !== ALL_BANKS && c.bank !== bank) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.bank.toLowerCase().includes(q);
    });
  }, [query, bank]);

  // Group the filtered cards by bank, banks alphabetical.
  const groups = useMemo(() => {
    const byBank = new Map<string, typeof ACTIVE_CARDS>();
    for (const c of filtered) {
      const list = byBank.get(c.bank) ?? [];
      list.push(c);
      byBank.set(c.bank, list);
    }
    return Array.from(byBank.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Which cards do you already have?</h2>
        <p className="mt-2 text-slate-600">
          Search or filter by bank, then pick the cards you hold. We&apos;ll show what
          you&apos;re earning, whether you&apos;re using them right, and where you can do better.
        </p>
      </header>

      {owned.length > 0 && (
        <p className="text-center text-sm font-medium text-brand-dark">
          {owned.length} card{owned.length === 1 ? "" : "s"} selected
        </p>
      )}

      <div className="space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards or banks…"
            aria-label="Search cards or banks"
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <BankChip label="All banks" active={bank === ALL_BANKS} onClick={() => setBank(ALL_BANKS)} />
          {banks.map((b) => (
            <BankChip key={b} label={b} active={bank === b} onClick={() => setBank(b)} />
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl bg-slate-100 p-6 text-center text-sm text-slate-500">
          No cards match “{query}”. Try a different search or bank.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map(([bankName, cards]) => (
            <div key={bankName}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {bankName}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {cards.map((card) => {
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
                            {card.network} · {REWARD_LABEL[card.rewardType]}
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
            </div>
          ))}
        </div>
      )}

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

function BankChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-brand-dark bg-brand-dark text-white"
          : "border-slate-200 text-slate-600 hover:border-brand",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
