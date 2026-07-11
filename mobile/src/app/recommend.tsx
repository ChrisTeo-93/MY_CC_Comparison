import { useMemo, useState } from "react";
import { View } from "react-native";
import type { Persona, RecommendationResult, SpendingProfile } from "@kadcompare/core";
import { recommend, DEFAULT_PERSONA } from "@kadcompare/core";
import { spacing } from "@/constants/theme";
import { ScreenContainer } from "@/components/ui/screen-container";
import { ProgressBar } from "@/components/wizard/progress-bar";
import { StepPersona } from "@/components/wizard/step-persona";
import { StepSpending } from "@/components/wizard/step-spending";
import { StepResults } from "@/components/wizard/step-results";

const STEP_LABELS = ["Persona", "Spending", "Results"];

export default function RecommendScreen() {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<Partial<Persona>>({});
  const [spending, setSpending] = useState<SpendingProfile>({});

  const result: RecommendationResult | null = useMemo(() => {
    if (step !== 2) return null;
    const full: Persona = { ...DEFAULT_PERSONA, ...persona };
    return recommend(spending, full);
  }, [step, persona, spending]);

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
    </ScreenContainer>
  );
}
