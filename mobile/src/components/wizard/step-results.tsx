import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CATEGORY_BY_KEY, rm, resolveSpending, buildConditions, buildTips } from "@kadcompare/core";
import type { Persona, RecommendationResult, SpendingProfile } from "@kadcompare/core";
import { colors, radii, spacing } from "@/constants/theme";
import { CardResultCard } from "@/components/results/card-result-card";
import { FreshnessBadge } from "@/components/results/freshness-badge";
import { CardConditionsPanel } from "@/components/results/card-conditions-panel";
import { TipsPanel } from "@/components/results/tips-panel";
import { Button } from "@/components/ui/button";

interface StepResultsProps {
  result: RecommendationResult;
  persona: Persona;
  spending: SpendingProfile;
  onRestart: () => void;
}

type ViewMode = "single" | "combo";

export function StepResults({ result, persona, spending, onRestart }: StepResultsProps) {
  const defaultView: ViewMode = persona.effortTolerance === "multi" ? "combo" : "single";
  const [view, setView] = useState<ViewMode>(defaultView);

  const resolved = resolveSpending(spending);
  const totalMonthly = Object.values(resolved).reduce((a, b) => a + b, 0);
  const tips = buildTips(result, spending);

  const { single, combo, ineligible } = result;
  const comboAvailable = combo.members.length > 1;

  const comboMembers = comboAvailable
    ? combo.members
    : single.slice(0, 1).map((s) => ({
        card: s.card,
        assignedCategories: s.breakdown.map((b) => b.category),
        contributionRM: s.netAnnualRM,
      }));

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={styles.header}>
        <Text style={styles.title}>Your recommendations</Text>
        <Text style={styles.subtitle}>
          Ranked by the real ringgit value they earn on your spending, net of fees.
        </Text>
        <View style={styles.legend}>
          <Text style={styles.legendLabel}>Data freshness:</Text>
          <Text style={[styles.legendItem, { color: colors.emerald600 }]}>🕒 recently verified</Text>
          <Text style={[styles.legendItem, { color: colors.amber600 }]}>🕒 getting old</Text>
          <Text style={[styles.legendItem, { color: colors.red500 }]}>⚠ stale</Text>
        </View>
      </View>

      <View style={styles.toggleWrap}>
        <Pressable style={[styles.toggleBtn, view === "single" && styles.toggleBtnActive]} onPress={() => setView("single")}>
          <Text style={[styles.toggleText, view === "single" && styles.toggleTextActive]}>Best single card</Text>
        </Pressable>
        <Pressable style={[styles.toggleBtn, view === "combo" && styles.toggleBtnActive]} onPress={() => setView("combo")}>
          <Text style={[styles.toggleText, view === "combo" && styles.toggleTextActive]}>
            Best combo {comboAvailable ? `(${combo.members.length} cards)` : ""}
          </Text>
        </Pressable>
      </View>

      {single.length > 0 && <TipsPanel tips={tips} />}

      {view === "single" && (
        <View style={{ gap: spacing.md }}>
          {single.length === 0 && (
            <Text style={styles.empty}>No eligible cards for your income bracket. Try adjusting your answers.</Text>
          )}
          {single.slice(0, 5).map((s, i) => (
            <CardResultCard key={s.card.id} score={s} rank={i + 1} highlight={i === 0} />
          ))}
        </View>
      )}

      {view === "combo" && (
        <View style={{ gap: spacing.md }}>
          {!comboAvailable ? (
            <View style={styles.comboNote}>
              <Text style={styles.comboNoteText}>
                For your spending, a single card is hard to beat — adding more cards
                wouldn&apos;t earn enough to justify it. Here&apos;s that card:
              </Text>
            </View>
          ) : (
            <View style={styles.comboTotal}>
              <Text style={styles.comboTotalLabel}>This {combo.members.length}-card combo earns about</Text>
              <Text style={styles.comboTotalValue}>
                {rm(combo.netAnnualRM)} <Text style={styles.comboTotalUnit}>/ year</Text>
              </Text>
              <Text style={styles.comboTotalFee}>net of {rm(combo.totalAnnualFee)} in annual fees</Text>
            </View>
          )}

          {comboMembers.map((m) => (
            <View key={m.card.id} style={styles.memberCard}>
              <View style={[styles.memberAccent, { backgroundColor: m.card.color }]} />
              <View style={styles.memberContent}>
                <View style={styles.memberHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.card.name}</Text>
                    <Text style={styles.memberMeta}>
                      {m.card.bank} · {m.card.network}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.memberValue}>{rm(m.contributionRM)}</Text>
                    <Text style={styles.memberValueUnit}>/ year</Text>
                  </View>
                </View>

                <Text style={styles.memberUseLabel}>Use this card for</Text>
                <View style={styles.memberCatRow}>
                  {m.assignedCategories.map((c) => (
                    <View key={c} style={styles.memberCatChip}>
                      <Text style={styles.memberCatChipText}>
                        {CATEGORY_BY_KEY[c].icon} {CATEGORY_BY_KEY[c].label}
                      </Text>
                    </View>
                  ))}
                </View>

                <CardConditionsPanel conditions={buildConditions(m.card, resolved, totalMonthly)} />

                <View style={styles.memberFooter}>
                  <FreshnessBadge date={m.card.lastVerified} href={m.card.sourceUrl} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {ineligible.length > 0 && (
        <IneligibleDisclosure cards={ineligible} />
      )}

      <Text style={styles.disclaimer}>
        Card terms were last verified mid-2026 from credible public sources and carry a
        confidence rating — most are medium confidence, so always confirm current terms
        with the bank before applying. Estimates only, not financial advice.
      </Text>

      <View style={{ alignItems: "center" }}>
        <Button label="↺ Start over" onPress={onRestart} variant="secondary" />
      </View>
    </View>
  );
}

function IneligibleDisclosure({ cards }: { cards: RecommendationResult["ineligible"] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.ineligibleBox}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <Text style={styles.ineligibleSummary}>
          {cards.length} card{cards.length === 1 ? "" : "s"} hidden (income requirement not met) {open ? "▲" : "▼"}
        </Text>
      </Pressable>
      {open && (
        <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
          {cards.map((c) => (
            <Text key={c.id} style={styles.ineligibleItem}>
              {c.name} — needs {rm(c.minAnnualIncome)}/year
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm },
  title: { fontSize: 24, fontWeight: "800", color: colors.slate900 },
  subtitle: { fontSize: 15, color: colors.slate600, textAlign: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.xs },
  legendLabel: { fontSize: 11, color: colors.slate400 },
  legendItem: { fontSize: 11, fontWeight: "600" },
  toggleWrap: { flexDirection: "row", backgroundColor: colors.slate100, borderRadius: radii.md, padding: 4, alignSelf: "center" },
  toggleBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.sm },
  toggleBtnActive: { backgroundColor: colors.white },
  toggleText: { fontSize: 13, fontWeight: "600", color: colors.slate500 },
  toggleTextActive: { color: colors.slate900 },
  empty: { textAlign: "center", color: colors.slate500 },
  comboNote: { backgroundColor: colors.slate100, borderRadius: radii.md, padding: spacing.md },
  comboNoteText: { fontSize: 13, color: colors.slate600, textAlign: "center" },
  comboTotal: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.brandLight, backgroundColor: "#f0fdfa", padding: spacing.lg, alignItems: "center" },
  comboTotalLabel: { fontSize: 13, color: colors.slate600 },
  comboTotalValue: { fontSize: 28, fontWeight: "800", color: colors.brandDark, marginTop: spacing.xs },
  comboTotalUnit: { fontSize: 14, fontWeight: "500", color: colors.slate500 },
  comboTotalFee: { fontSize: 11, color: colors.slate500, marginTop: spacing.xs },
  memberCard: { flexDirection: "row", borderRadius: radii.lg, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.white, overflow: "hidden" },
  memberAccent: { width: 6 },
  memberContent: { flex: 1, padding: spacing.lg },
  memberHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  memberName: { fontSize: 16, fontWeight: "800", color: colors.slate900 },
  memberMeta: { fontSize: 13, color: colors.slate500 },
  memberValue: { fontSize: 18, fontWeight: "800", color: colors.brandDark },
  memberValueUnit: { fontSize: 11, color: colors.slate500 },
  memberUseLabel: { fontSize: 10, fontWeight: "700", color: colors.slate400, textTransform: "uppercase", marginTop: spacing.sm },
  memberCatRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  memberCatChip: { backgroundColor: colors.slate100, borderRadius: radii.full, paddingVertical: 4, paddingHorizontal: spacing.sm },
  memberCatChipText: { fontSize: 11, color: colors.slate700 },
  memberFooter: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.slate100 },
  ineligibleBox: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.white, padding: spacing.md },
  ineligibleSummary: { fontSize: 13, fontWeight: "600", color: colors.slate700 },
  ineligibleItem: { fontSize: 12, color: colors.slate500 },
  disclaimer: { fontSize: 11, color: colors.slate400, textAlign: "center", paddingHorizontal: spacing.md },
});
