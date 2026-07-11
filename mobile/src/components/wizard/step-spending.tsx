import { StyleSheet, Text, TextInput, View } from "react-native";
import { CATEGORIES, rm } from "@kadcompare/core";
import type { SpendingProfile } from "@kadcompare/core";
import { colors, radii, spacing } from "@/constants/theme";
import { Button } from "@/components/ui/button";

interface StepSpendingProps {
  spending: SpendingProfile;
  onChange: (patch: SpendingProfile) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function StepSpending({ spending, onChange, onBack, onSubmit }: StepSpendingProps) {
  const total = CATEGORIES.reduce((sum, c) => {
    const v = spending[c.key];
    return sum + (v !== undefined ? v : c.defaultMonthly);
  }, 0);

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={styles.header}>
        <Text style={styles.title}>How do you spend each month?</Text>
        <Text style={styles.subtitle}>
          Rough figures are fine. Leave any blank and we&apos;ll use a sensible default.
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        {CATEGORIES.map((cat) => {
          const value = spending[cat.key];
          return (
            <View key={cat.key} style={styles.row}>
              <Text style={styles.icon}>{cat.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{cat.label}</Text>
                <Text style={styles.hint}>{cat.hint}</Text>
              </View>
              <View style={styles.inputWrap}>
                <Text style={styles.currency}>RM</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder={String(cat.defaultMonthly)}
                  placeholderTextColor={colors.slate400}
                  value={value !== undefined ? String(value) : ""}
                  onChangeText={(text) => {
                    const digits = text.replace(/[^0-9]/g, "");
                    onChange({ [cat.key]: digits === "" ? undefined : Math.max(0, Number(digits)) });
                  }}
                  style={styles.input}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.totalBox}>
        <Text style={styles.totalText}>
          Estimated total monthly spend: <Text style={styles.totalValue}>{rm(total)}</Text>
        </Text>
      </View>

      <View style={styles.footer}>
        <Button label="← Back" onPress={onBack} variant="ghost" />
        <Button label="See my recommendations →" onPress={onSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm },
  title: { fontSize: 24, fontWeight: "800", color: colors.slate900, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.slate600, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  icon: { fontSize: 22 },
  label: { fontSize: 14, fontWeight: "600", color: colors.slate900 },
  hint: { fontSize: 12, color: colors.slate500 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  currency: { fontSize: 13, color: colors.slate400 },
  input: {
    width: 76,
    textAlign: "right",
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    fontSize: 15,
    color: colors.slate900,
  },
  totalBox: {
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
  },
  totalText: { fontSize: 14, color: colors.slate600 },
  totalValue: { fontWeight: "700", color: colors.slate900 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
