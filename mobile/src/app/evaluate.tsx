import { useMemo, useState } from "react";
import { View } from "react-native";
import type { Persona, SpendingProfile } from "@kadcompare/core";
import { evaluateOwned, DEFAULT_PERSONA } from "@kadcompare/core";
import { spacing } from "@/constants/theme";
import { ScreenContainer } from "@/components/ui/screen-container";
import { ProgressBar } from "@/components/wizard/progress-bar";
import { StepPersona } from "@/components/wizard/step-persona";
import { StepSpending } from "@/components/wizard/step-spending";
import { StepOwnedCards } from "@/components/wizard/step-owned-cards";
import { StepEvaluation } from "@/components/wizard/step-evaluation";

const STEP_LABELS = ["Persona", "Spending", "Your cards", "Evaluation"];

export default function EvaluateScreen() {
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
    <ScreenContainer>
      <View style={{ marginBottom: spacing.md }}>
        <ProgressBar steps={STEP_LABELS} current={step} />
      </View>

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
    </ScreenContainer>
  );
}
