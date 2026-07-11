import { StyleSheet, Text, View } from "react-native";
import type { MaxTip } from "@kadcompare/core";
import { rm } from "@kadcompare/core";
import { colors, radii, spacing } from "@/constants/theme";

/**
 * "Maximize your gains" callout — actionable moves to capture more from the
 * recommended cards, chiefly routing cap-overflow spend onto a second card.
 */
export function TipsPanel({ tips }: { tips: MaxTip[] }) {
  if (tips.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>
          ✓ Your recommended cards already capture your spend efficiently — no category
          is overflowing its cap, so nothing is going to waste.
        </Text>
      </View>
    );
  }

  const totalGain = tips.reduce((sum, t) => sum + t.annualGainRM, 0);

  return (
    <View style={styles.box}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>💡 Maximize your gains</Text>
        <Text style={styles.badge}>up to +{rm(totalGain)}/yr</Text>
      </View>
      <Text style={styles.subtitle}>
        Small ways to use your recommended cards together so no spend is wasted.
      </Text>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {tips.map((t, i) => (
          <View key={i} style={styles.tip}>
            <View style={styles.tipHeader}>
              <Text style={styles.tipTitle}>{t.title}</Text>
              <Text style={styles.tipGain}>+{rm(t.annualGainRM)}/yr</Text>
            </View>
            <Text style={styles.tipDetail}>{t.detail}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footnote}>
        Estimates based on your inputs and current cap/threshold data. Worth it only if
        the extra admin suits you.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.emerald100,
    backgroundColor: colors.emerald50,
    padding: spacing.md,
  },
  emptyText: { fontSize: 13, color: colors.emerald800, textAlign: "center" },
  box: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brandLight,
    backgroundColor: "#f0fdfa",
    padding: spacing.lg,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: "800", color: colors.slate900 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.emerald700,
    backgroundColor: colors.emerald100,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  subtitle: { fontSize: 13, color: colors.slate600, marginTop: spacing.xs },
  tip: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.sm },
  tipHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  tipTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.slate900 },
  tipGain: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.emerald700,
    backgroundColor: colors.emerald100,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  tipDetail: { fontSize: 13, color: colors.slate600, marginTop: spacing.xs },
  footnote: { fontSize: 11, color: colors.slate400, marginTop: spacing.md },
});
