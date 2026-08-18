import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/constants/theme";

interface OptionCardProps {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  /** Optional line under the description, e.g. how many cards an answer leaves. */
  footnote?: string;
  /** Severity of that footnote — drives its colour. */
  footnoteTone?: "neutral" | "warn" | "bad";
}

/** Selectable card used by the persona quiz and the owned-cards picker. */
export function OptionCard({
  label,
  description,
  selected,
  onPress,
  footnote,
  footnoteTone = "neutral",
}: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
      {footnote && (
        <Text
          style={[
            styles.footnote,
            footnoteTone === "bad" && { color: colors.red500 },
            footnoteTone === "warn" && { color: colors.amber700 },
          ]}
        >
          {footnote}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  cardSelected: {
    borderColor: colors.brandDark,
    backgroundColor: colors.emerald50,
  },
  label: { fontSize: 14, fontWeight: "600", color: colors.slate900 },
  description: { fontSize: 12, color: colors.slate500, marginTop: spacing.xs },
  footnote: { fontSize: 11, fontWeight: "600", color: colors.slate400, marginTop: spacing.sm },
});
