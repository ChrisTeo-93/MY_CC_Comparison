import { Pressable, StyleSheet, Text, View } from "react-native";
import { ACTIVE_CARDS } from "@kadcompare/core";
import { colors, radii, spacing } from "@/constants/theme";
import { Button } from "@/components/ui/button";

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
    <View style={{ gap: spacing.lg }}>
      <View style={styles.header}>
        <Text style={styles.title}>Which cards do you already have?</Text>
        <Text style={styles.subtitle}>
          Pick the credit cards you currently hold. We&apos;ll show what you&apos;re earning,
          whether you&apos;re using them right, and where you can do better.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        {ACTIVE_CARDS.map((card) => {
          const on = set.has(card.id);
          return (
            <Pressable
              key={card.id}
              onPress={() => onToggle(card.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.row, on && styles.rowOn]}
            >
              <View style={[styles.accent, { backgroundColor: card.color }]} />
              <View style={styles.rowContent}>
                <View>
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardMeta}>
                    {card.bank} · {REWARD_LABEL[card.rewardType]}
                  </Text>
                </View>
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Button label="← Back" onPress={onBack} variant="ghost" />
        <Button
          label={`Evaluate my ${owned.length || ""} card${owned.length === 1 ? "" : "s"} →`}
          onPress={onSubmit}
          disabled={owned.length === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "800", color: colors.slate900, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.slate600, textAlign: "center" },
  row: {
    flexDirection: "row",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  rowOn: { borderColor: colors.brandDark, borderWidth: 2 },
  accent: { width: 5 },
  rowContent: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md },
  cardName: { fontSize: 14, fontWeight: "600", color: colors.slate900 },
  cardMeta: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.slate300,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { borderColor: colors.brandDark, backgroundColor: colors.brandDark },
  checkmark: { color: colors.white, fontSize: 13, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
