"use client";

import type { Persona } from "@kadcompare/core";
import { PERSONA_QUESTIONS } from "@kadcompare/core";

interface StepPersonaProps {
  persona: Partial<Persona>;
  onChange: (patch: Partial<Persona>) => void;
  onNext: () => void;
}

export function StepPersona({ persona, onChange, onNext }: StepPersonaProps) {
  const answeredAll = PERSONA_QUESTIONS.every((q) => persona[q.key] !== undefined);

  return (
    <div className="space-y-10">
      <header className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Let&apos;s understand you first</h2>
        <p className="mt-2 text-slate-600">
          Your preferences decide how we weigh the cards — not everyone wants the same thing.
        </p>
      </header>

      {PERSONA_QUESTIONS.map((q) => {
        const selected = persona[q.key];
        return (
          <fieldset key={q.key}>
            <legend className="text-base font-semibold text-slate-900">{q.title}</legend>
            <p className="mb-3 text-sm text-slate-500">{q.subtitle}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {q.options.map((opt) => {
                const isOn = selected === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ [q.key]: opt.value } as Partial<Persona>)}
                    className={[
                      "rounded-xl border p-4 text-left transition",
                      isOn
                        ? "border-brand-dark bg-brand/5 ring-1 ring-brand-dark"
                        : "border-slate-200 bg-white hover:border-brand",
                    ].join(" ")}
                  >
                    <div className="font-medium text-slate-900">{opt.label}</div>
                    <div className="mt-1 text-sm text-slate-500">{opt.description}</div>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!answeredAll}
          onClick={onNext}
          className="rounded-lg bg-brand-dark px-6 py-3 font-semibold text-white transition enabled:hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next: my spending →
        </button>
      </div>
    </div>
  );
}
