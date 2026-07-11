import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CardConditions, EarnCondition } from "@kadcompare/core";
import { rm } from "@kadcompare/core";
import { colors, radii, spacing } from "@/constants/theme";

/**
 * Expandable "How you earn this" panel — the product's USP. Spells out the
 * spend thresholds and caps behind each reward in plain language, checked
 * against the user's own spending.
 */
export function CardConditionsPanel({ conditions }: { conditions: CardConditions }) {
  const [open, setOpen] = useState(false);
  const { earn, fee, baseRateLabel, yourMonthlyTotalRM } = conditions;

  return (
    <View style={{ marginTop: spacing.md }}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button">
        <Text style={styles.toggle}>
          {open ? "Hide the conditions ▲" : "How you earn this ▼"}
        </Text>
      </Pressable>

      {open && (
        <View style={styles.box}>
          <Text style={styles.basis}>
            Based on about <Text style={styles.basisBold}>{rm(yourMonthlyTotalRM)}/month</Text>{" "}
            total spend from your answers.
          </Text>

          {earn.length === 0 ? (
            <Text style={styles.flat}>
              Flat {baseRateLabel} on everything — no spend thresholds to worry about.
            </Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {earn.map((c, i) => (
                <EarnRow key={i} c={c} totalMonthly={yourMonthlyTotalRM} />
              ))}
            </View>
          )}

          <View style={styles.divider}>
            <Text style={styles.everythingElse}>
              <Text style={styles.muted}>Everything else earns</Text> {baseRateLabel}.
            </Text>
            <Text style={[styles.feeText, { color: fee.met ? colors.emerald700 : colors.amber700 }]}>
              {fee.met ? "✓ " : "• "}
              {fee.text}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function EarnRow({ c, totalMonthly }: { c: EarnCondition; totalMonthly: number }) {
  const status = !c.unlocked
    ? { label: "Locked", bg: colors.amber100, fg: colors.amber700 }
    : { label: c.hitsCap ? "You max this" : "Active", bg: colors.emerald100, fg: colors.emerald700 };

  const shortfall = c.minTotalSpendRM ? Math.max(0, c.minTotalSpendRM - totalMonthly) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle}>
          {c.rateLabel} · {c.label}
        </Text>
        <Text style={[styles.chip, { backgroundColor: status.bg, color: status.fg }]}>
          {status.label}
        </Text>
      </View>

      <Text style={styles.rowBody}>
        {c.maxMonthlyRewardRM !== undefined && c.spendToMaxRM !== undefined
          ? `Earn up to ${rm(c.maxMonthlyRewardRM)}/mo back — spend about ${rm(c.spendToMaxRM)}/mo on ${c.label.toLowerCase()} to max it out.`
          : c.maxMonthlyRewardRM !== undefined
            ? `Earn up to ${rm(c.maxMonthlyRewardRM)}/mo back.`
            : "No monthly cap on this rate."}
      </Text>

      {c.minTotalSpendRM !== undefined && (
        <Text style={[styles.rowNote, { color: c.unlocked ? colors.emerald700 : colors.amber700 }]}>
          {c.unlocked
            ? `✓ Unlocked — needs ${rm(c.minTotalSpendRM)}/mo total spend, and you're at ${rm(totalMonthly)}.`
            : `✗ Needs ${rm(c.minTotalSpendRM)}/mo total spend to activate — you're at ${rm(totalMonthly)}, about ${rm(shortfall)} short.`}
        </Text>
      )}

      {c.note && <Text style={styles.note}>{c.note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { fontSize: 14, fontWeight: "700", color: colors.brandDark },
  box: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.slate50,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  basis: { fontSize: 12, color: colors.slate500 },
  basisBold: { fontWeight: "600", color: colors.slate700 },
  flat: { fontSize: 14, color: colors.slate600 },
  row: { backgroundColor: colors.white, borderRadius: radii.sm, padding: spacing.sm },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.slate900 },
  chip: { fontSize: 11, fontWeight: "600", paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: radii.full, overflow: "hidden" },
  rowBody: { fontSize: 13, color: colors.slate600, marginTop: spacing.xs },
  rowNote: { fontSize: 12, marginTop: spacing.xs },
  note: { fontSize: 12, color: colors.slate400, marginTop: spacing.xs },
  divider: { borderTopWidth: 1, borderTopColor: colors.slate200, paddingTop: spacing.sm, gap: spacing.xs },
  everythingElse: { fontSize: 14, color: colors.slate600 },
  muted: { color: colors.slate400 },
  feeText: { fontSize: 14 },
});
