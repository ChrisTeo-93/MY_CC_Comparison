import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { Evaluation } from "@kadcompare/core";
import { rm } from "@kadcompare/core";
import { colors, radii, spacing } from "@/constants/theme";
import { CardResultCard } from "@/components/results/card-result-card";
import { TipsPanel } from "@/components/results/tips-panel";
import { Button } from "@/components/ui/button";

interface StepEvaluationProps {
  evaluation: Evaluation;
  onRestart: () => void;
}

export function StepEvaluation({ evaluation, onRestart }: StepEvaluationProps) {
  const router = useRouter();
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
    <View style={{ gap: spacing.xl }}>
      <View style={styles.header}>
        <Text style={styles.title}>Your current cards, evaluated</Text>
        <Text style={styles.subtitle}>
          What your {ownedScores.length} card{ownedScores.length === 1 ? "" : "s"} earn on
          your spending — and where there&apos;s more to capture.
        </Text>
      </View>

      <View style={styles.headline}>
        <Text style={styles.headlineLabel}>Using your cards optimally, you earn about</Text>
        <Text style={styles.headlineValue}>
          {rm(currentNetAnnualRM)} <Text style={styles.headlineUnit}>/ year</Text>
        </Text>

        {alreadyOptimal ? (
          <View style={styles.optimalBox}>
            <Text style={styles.optimalText}>
              🎉 You&apos;re already on the best setup for your spending — no card we list
              would meaningfully beat what you hold.
            </Text>
          </View>
        ) : (
          <Text style={styles.upsideText}>
            The best possible setup for your spending earns{" "}
            <Text style={styles.bold}>{rm(bestNetAnnualRM)}/yr</Text> — you&apos;re leaving
            about <Text style={styles.upsideAmount}>{rm(upsideAnnualRM)}/yr</Text> on the
            table.
          </Text>
        )}
      </View>

      {tips.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionTitle}>Get more from what you have</Text>
          <TipsPanel tips={tips} />
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.sectionTitle}>What each card earns you</Text>
        <View style={{ gap: spacing.md }}>
          {ownedScores.map((s, i) => (
            <CardResultCard key={s.card.id} score={s} rank={i + 1} highlight={i === 0} />
          ))}
        </View>
      </View>

      {suggestions.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionTitle}>Adding one of these would earn you more</Text>
          <View style={{ gap: spacing.sm }}>
            {suggestions.map((s) => (
              <Pressable
                key={s.card.id}
                onPress={() => Linking.openURL(s.card.sourceUrl)}
                style={styles.suggestionRow}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
                  <View style={[styles.suggestionAccent, { backgroundColor: s.card.color }]} />
                  <View>
                    <Text style={styles.suggestionName}>{s.card.name}</Text>
                    <Text style={styles.suggestionBank}>{s.card.bank}</Text>
                  </View>
                </View>
                <Text style={styles.suggestionGain}>+{rm(s.addedAnnualRM)}/yr</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.disclaimer}>
        Estimates based on your inputs and current card data. Owned cards are evaluated
        regardless of income (you already hold them); suggested cards respect their income
        requirements.
      </Text>

      <View style={{ alignItems: "center", gap: spacing.md }}>
        <Pressable onPress={() => router.push("/recommend")}>
          <Text style={styles.link}>Or find your best card from scratch →</Text>
        </Pressable>
        <Button label="↺ Start over" onPress={onRestart} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "800", color: colors.slate900, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.slate600, textAlign: "center" },
  headline: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.brandLight,
    backgroundColor: "#f0fdfa",
    padding: spacing.xl,
    alignItems: "center",
  },
  headlineLabel: { fontSize: 13, color: colors.slate600 },
  headlineValue: { fontSize: 32, fontWeight: "800", color: colors.brandDark, marginTop: spacing.xs },
  headlineUnit: { fontSize: 15, fontWeight: "500", color: colors.slate500 },
  optimalBox: { marginTop: spacing.md, backgroundColor: colors.emerald50, borderRadius: radii.md, padding: spacing.sm },
  optimalText: { fontSize: 13, color: colors.emerald800, textAlign: "center" },
  upsideText: { marginTop: spacing.md, fontSize: 13, color: colors.slate600, textAlign: "center" },
  bold: { fontWeight: "700", color: colors.slate900 },
  upsideAmount: { fontWeight: "700", color: colors.amber700 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.slate900 },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  suggestionAccent: { width: 6, height: 32, borderRadius: 3 },
  suggestionName: { fontSize: 14, fontWeight: "600", color: colors.slate900 },
  suggestionBank: { fontSize: 12, color: colors.slate500 },
  suggestionGain: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.emerald700,
    backgroundColor: colors.emerald100,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  disclaimer: { fontSize: 11, color: colors.slate400, textAlign: "center" },
  link: { fontSize: 14, fontWeight: "700", color: colors.brandDark },
});
