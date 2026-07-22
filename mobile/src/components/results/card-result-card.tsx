import { StyleSheet, Text, View } from "react-native";
import { CATEGORY_BY_KEY, rm, walletsForCard, WALLET_META } from "@kadcompare/core";
import type { CardScore } from "@kadcompare/core";
import { colors, radii, spacing } from "@/constants/theme";
import { FreshnessBadge, ConfidenceChip } from "@/components/results/freshness-badge";
import { CardConditionsPanel } from "@/components/results/card-conditions-panel";

const REWARD_LABEL: Record<string, string> = {
  cashback: "Cashback",
  points: "Points",
  miles: "Miles",
  hybrid: "Hybrid",
};

interface CardResultCardProps {
  score: CardScore;
  rank: number;
  highlight?: boolean;
}

export function CardResultCard({ score, rank, highlight }: CardResultCardProps) {
  const { card } = score;
  const topCategories = [...score.breakdown]
    .filter((b) => b.annualValueRM > 0)
    .sort((a, b) => b.annualValueRM - a.annualValueRM)
    .slice(0, 3);

  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      <View style={[styles.accent, { backgroundColor: card.color }]} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              {highlight && (
                <Text style={styles.bestMatch}>Best match</Text>
              )}
              <Text style={styles.rank}>#{rank}</Text>
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{card.name}</Text>
              <ConfidenceChip level={card.confidence} />
            </View>
            <Text style={styles.meta}>
              {card.bank} · {card.network} · {REWARD_LABEL[card.rewardType]}
            </Text>
          </View>
          <View style={styles.valueBox}>
            <Text style={styles.value}>{rm(score.netAnnualRM)}</Text>
            <Text style={styles.valueLabel}>net value / year</Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          {score.reasons.map((r, i) => (
            <Text key={i} style={styles.reason}>
              <Text style={{ color: colors.brandDark }}>✓ </Text>
              {r}
            </Text>
          ))}
        </View>

        {topCategories.length > 0 && (
          <View style={styles.catRow}>
            {topCategories.map((b) => (
              <View key={b.category} style={styles.catChip}>
                <Text style={styles.catChipText}>
                  {CATEGORY_BY_KEY[b.category].icon} {CATEGORY_BY_KEY[b.category].label}:{" "}
                  <Text style={styles.catChipValue}>{rm(b.annualValueRM)}</Text>
                  {b.capped ? <Text style={styles.catChipCapped}> (capped)</Text> : null}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.walletRow}>
          <Text style={styles.walletLabel}>Mobile wallets:</Text>
          {walletsForCard(card).length === 0 ? (
            <Text style={styles.walletLabel}>none</Text>
          ) : (
            walletsForCard(card).map((w) => (
              <Text key={w} style={styles.walletChip}>
                {WALLET_META[w].label}
              </Text>
            ))
          )}
        </View>

        <CardConditionsPanel conditions={score.conditions} />

        {card.dataNote && card.confidence !== "high" && (
          <Text style={styles.dataNote}>ⓘ {card.dataNote}</Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.feeText}>
            {card.annualFee === 0
              ? "No annual fee"
              : score.effectiveAnnualFee === 0
                ? `Annual fee RM${card.annualFee} (waived)`
                : `Annual fee RM${card.annualFee}`}
            {" · "}+RM{score.govtTaxRM} govt tax/yr
          </Text>
          <FreshnessBadge date={card.lastVerified} href={card.sourceUrl} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  cardHighlight: { borderColor: colors.brandDark, borderWidth: 2 },
  accent: { width: 6 },
  content: { flex: 1, padding: spacing.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bestMatch: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.white,
    backgroundColor: colors.brandDark,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  rank: { fontSize: 12, fontWeight: "600", color: colors.slate400 },
  nameRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  name: { fontSize: 17, fontWeight: "800", color: colors.slate900 },
  meta: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  valueBox: { alignItems: "flex-end" },
  value: { fontSize: 20, fontWeight: "800", color: colors.brandDark },
  valueLabel: { fontSize: 11, color: colors.slate500 },
  reason: { fontSize: 13, color: colors.slate700 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  catChip: { backgroundColor: colors.slate100, borderRadius: radii.full, paddingVertical: 4, paddingHorizontal: spacing.sm },
  catChipText: { fontSize: 11, color: colors.slate600 },
  catChipValue: { fontWeight: "700", color: colors.slate700 },
  catChipCapped: { color: colors.amber600 },
  walletRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: spacing.md },
  walletLabel: { fontSize: 11, color: colors.slate400 },
  walletChip: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.white,
    backgroundColor: colors.slate900,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: radii.sm,
    overflow: "hidden",
  },
  dataNote: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.amber800,
    backgroundColor: colors.amber50,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  feeText: { fontSize: 12, color: colors.slate500 },
});
