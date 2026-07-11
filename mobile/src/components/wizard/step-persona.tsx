import { StyleSheet, Text, View } from "react-native";
import type { Persona } from "@kadcompare/core";
import { PERSONA_QUESTIONS } from "@kadcompare/core";
import { colors, spacing } from "@/constants/theme";
import { OptionCard } from "@/components/ui/option-card";
import { Button } from "@/components/ui/button";

interface StepPersonaProps {
  persona: Partial<Persona>;
  onChange: (patch: Partial<Persona>) => void;
  onNext: () => void;
}

export function StepPersona({ persona, onChange, onNext }: StepPersonaProps) {
  const answeredAll = PERSONA_QUESTIONS.every((q) => persona[q.key] !== undefined);

  return (
    <View style={{ gap: spacing.xxl }}>
      <View style={styles.header}>
        <Text style={styles.title}>Let&apos;s understand you first</Text>
        <Text style={styles.subtitle}>
          Your preferences decide how we weigh the cards — not everyone wants the same
          thing.
        </Text>
      </View>

      {PERSONA_QUESTIONS.map((q) => {
        const selected = persona[q.key];
        return (
          <View key={q.key} style={{ gap: spacing.md }}>
            <Text style={styles.qTitle}>{q.title}</Text>
            <Text style={styles.qSubtitle}>{q.subtitle}</Text>
            <View style={styles.grid}>
              {q.options.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={selected === opt.value}
                  onPress={() => onChange({ [q.key]: opt.value } as Partial<Persona>)}
                />
              ))}
            </View>
          </View>
        );
      })}

      <View style={styles.footer}>
        <Button label="Next: my spending →" onPress={onNext} disabled={!answeredAll} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm },
  title: { fontSize: 24, fontWeight: "800", color: colors.slate900, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.slate600, textAlign: "center" },
  qTitle: { fontSize: 16, fontWeight: "700", color: colors.slate900 },
  qSubtitle: { fontSize: 13, color: colors.slate500, marginTop: -spacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  footer: { alignItems: "flex-end" },
});
