"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Persona, SpendingProfile } from "@/lib/domain/types";
import { evaluateOwned } from "@/lib/engine/evaluate";
import { DEFAULT_PERSONA } from "@/lib/persona/questions";
import { ProgressBar } from "@/components/wizard/ProgressBar";
import { StepPersona } from "@/components/wizard/StepPersona";
import { StepSpending } from "@/components/wizard/StepSpending";
import { StepOwnedCards } from "@/components/wizard/StepOwnedCards";
import { StepEvaluation } from "@/components/wizard/StepEvaluation";

const STEP_LABELS = ["Persona", "Spending", "Your cards", "Evaluation"];

export default function EvaluatePage() {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<Partial<Persona>>({});
  const [spending, setSpending] = useState<SpendingProfile>({});
  const [owned, setOwned] = useState<string[]>([]);

  const evaluation = useMemo(() => {
    if (step !== 3) return null;
    return evaluateOwned(spending, { ...DEFAULT_PERSONA, ...persona }, owned);
  }, [step, persona, spending, owned]);

  const toggle = (id: string) =>
    setOwned((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-brand-dark hover:underline">
          ← KadCompare
        </Link>
      </div>

      <div className="mb-10">
        <ProgressBar steps={STEP_LABELS} current={step} />
      </div>

      {step === 0 && (
        <StepPersona
          persona={persona}
          onChange={(patch) => setPersona((p) => ({ ...p, ...patch }))}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <StepSpending
          spending={spending}
          onChange={(patch) => setSpending((s) => ({ ...s, ...patch }))}
          onBack={() => setStep(0)}
          onSubmit={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepOwnedCards
          owned={owned}
          onToggle={toggle}
          onBack={() => setStep(1)}
          onSubmit={() => setStep(3)}
        />
      )}

      {step === 3 && evaluation && (
        <StepEvaluation
          evaluation={evaluation}
          onRestart={() => {
            setPersona({});
            setSpending({});
            setOwned([]);
            setStep(0);
          }}
        />
      )}
    </main>
  );
}
