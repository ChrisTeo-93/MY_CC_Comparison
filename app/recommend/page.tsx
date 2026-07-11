"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Persona, RecommendationResult, SpendingProfile } from "@kadcompare/core";
import { recommend, DEFAULT_PERSONA } from "@kadcompare/core";
import { ProgressBar } from "@/components/wizard/ProgressBar";
import { StepPersona } from "@/components/wizard/StepPersona";
import { StepSpending } from "@/components/wizard/StepSpending";
import { StepResults } from "@/components/wizard/StepResults";

const STEP_LABELS = ["Persona", "Spending", "Results"];

export default function RecommendPage() {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<Partial<Persona>>({});
  const [spending, setSpending] = useState<SpendingProfile>({});

  const result: RecommendationResult | null = useMemo(() => {
    if (step !== 2) return null;
    const full: Persona = { ...DEFAULT_PERSONA, ...persona };
    return recommend(spending, full);
  }, [step, persona, spending]);

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

      {step === 2 && result && (
        <StepResults
          result={result}
          persona={{ ...DEFAULT_PERSONA, ...persona }}
          spending={spending}
          onRestart={() => {
            setPersona({});
            setSpending({});
            setStep(0);
          }}
        />
      )}
    </main>
  );
}
