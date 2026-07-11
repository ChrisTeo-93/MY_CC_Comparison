import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/constants/theme";

interface ProgressBarProps {
  steps: string[];
  current: number; // 0-based index
}

export function ProgressBar({ steps, current }: ProgressBarProps) {
  return (
    <View style={styles.row}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.dot, (done || active) && styles.dotActive]}>
              <Text style={[styles.dotLabel, (done || active) && styles.dotLabelActive]}>
                {done ? "✓" : i + 1}
              </Text>
            </View>
            {i < steps.length - 1 && <View style={styles.connector} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  step: { flexDirection: "row", alignItems: "center" },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate200,
  },
  dotActive: { backgroundColor: colors.brandDark },
  dotLabel: { fontSize: 12, fontWeight: "600", color: colors.slate500 },
  dotLabelActive: { color: colors.white },
  connector: { width: spacing.lg, height: 1, backgroundColor: colors.slate200, marginHorizontal: spacing.xs },
});
