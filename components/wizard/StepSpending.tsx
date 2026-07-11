"use client";

import { CATEGORIES, rm } from "@kadcompare/core";
import type { SpendingProfile } from "@kadcompare/core";

interface StepSpendingProps {
  spending: SpendingProfile;
  onChange: (patch: SpendingProfile) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function StepSpending({ spending, onChange, onBack, onSubmit }: StepSpendingProps) {
  const total = CATEGORIES.reduce((sum, c) => {
    const v = spending[c.key];
    return sum + (v !== undefined ? v : c.defaultMonthly);
  }, 0);

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">How do you spend each month?</h2>
        <p className="mt-2 text-slate-600">
          Rough figures are fine. Leave any blank and we&apos;ll use a sensible default.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const value = spending[cat.key];
          const usingDefault = value === undefined;
          return (
            <label
              key={cat.key}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="flex-1">
                <span className="block font-medium text-slate-900">{cat.label}</span>
                <span className="block text-xs text-slate-500">{cat.hint}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-sm text-slate-400">RM</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder={String(cat.defaultMonthly)}
                  value={value ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onChange({
                      [cat.key]: raw === "" ? undefined : Math.max(0, Number(raw)),
                    });
                  }}
                  className={[
                    "w-24 rounded-lg border px-2 py-1.5 text-right outline-none focus:border-brand-dark",
                    usingDefault ? "border-slate-200 text-slate-400" : "border-slate-300 text-slate-900",
                  ].join(" ")}
                />
              </span>
            </label>
          );
        })}
      </div>

      <div className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
        Estimated total monthly spend:{" "}
        <span className="font-semibold text-slate-900">{rm(total)}</span>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-5 py-3 font-semibold text-slate-600 transition hover:text-slate-900"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-lg bg-brand-dark px-6 py-3 font-semibold text-white transition hover:bg-brand"
        >
          See my recommendations →
        </button>
      </div>
    </div>
  );
}
