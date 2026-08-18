import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CATEGORY_BY_KEY, rm, resolveSpending, buildConditions, buildTips, explainOmissions, govtServiceTax, incomeUpside, walletsForCard, WALLET_META } from "@kadcompare/core";
import type { CardOmission, Persona, RecommendationResult, SpendingProfile } from "@kadcompare/core";
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

  const { single, combo, ineligible, walletFiltered, additions } = result;
  const comboAvailable = combo.members.length > 1;
  const walletPref = persona.walletPreference ?? "any";
  const walletLabel = walletPref === "any" ? null : WALLET_META[walletPref].label;
  const emptyMessage =
    walletLabel && walletFiltered.length > 0
      ? `No cards support ${walletLabel} for your income bracket. Try “Doesn’t matter” for the wallet question, or adjust your answers.`
      : "No eligible cards for your income bracket. Try adjusting your answers.";
  // Every card carries the RM25 govt tax, so at very low spend the best card can
  // still be a net loss. Saying so is more useful than ranking losses.
  const nothingPaysOff = single.length > 0 && single[0].netAnnualRM <= 0;
  const omissions = explainOmissions(result, spending);
  const upside = incomeUpside(spending, persona);

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

      {nothingPaysOff && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            <Text style={styles.warnStrong}>At this spending level, no card pays for itself.</Text>{" "}
            Every Malaysian credit card carries a mandatory RM25/year government service
            tax, and on the spending you entered none of these earn that back. If
            that&apos;s really how much you spend, you&apos;re better off without one —
            otherwise go back and check the amounts.
          </Text>
        </View>
      )}

      {single.length > 0 && !nothingPaysOff && <TipsPanel tips={tips} />}

      {view === "single" && (
        <View style={{ gap: spacing.md }}>
          {single.length === 0 && <Text style={styles.empty}>{emptyMessage}</Text>}
          {single.slice(0, 5).map((s, i) => (
            <CardResultCard key={s.card.id} score={s} rank={i + 1} highlight={i === 0} />
          ))}
        </View>
      )}

      {view === "combo" && (
        <View style={{ gap: spacing.md }}>
          {single.length === 0 ? (
            <Text style={styles.empty}>{emptyMessage}</Text>
          ) : !comboAvailable ? (
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
              <Text style={styles.comboTotalFee}>
                net of {rm(combo.totalAnnualFee)} in annual fees + {rm(combo.totalGovtTaxRM)} govt tax
                across {combo.members.length} card{combo.members.length === 1 ? "" : "s"}
              </Text>
            </View>
          )}

          {single.length > 0 && comboMembers.map((m) => (
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
                    <Text style={[styles.memberValue, m.contributionRM < 0 && styles.valueNegative]}>
                      {rm(m.contributionRM)}
                    </Text>
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

                <View style={[styles.memberFooter, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                  <Text style={{ fontSize: 11, color: colors.slate500 }}>+{rm(govtServiceTax(m.card))} govt tax/yr</Text>
                  <FreshnessBadge date={m.card.lastVerified} href={m.card.sourceUrl} />
                </View>
              </View>
            </View>
          ))}

          {additions.length > 0 && (
            <View style={styles.addBox}>
              <Text style={styles.addTitle}>Consider adding a card</Text>
              <Text style={styles.addSubtitle}>
                Not part of the {combo.members.length}-card set above. If you&apos;re willing
                to carry another card, these would earn you more on top of it.
              </Text>
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                {additions.map((a) => (
                  <View key={a.card.id} style={styles.addRow}>
                    <View style={[styles.addAccent, { backgroundColor: a.card.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addName}>{a.card.name}</Text>
                      <Text style={styles.addMeta}>
                        {a.card.bank} · {a.card.network}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.addGain}>+{rm(a.addedAnnualRM)}</Text>
                      <Text style={styles.addGainUnit}>/ year</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.addFootnote}>
                Already net of each card&apos;s own annual fee and its RM25 government
                service tax — so this is what you&apos;d actually gain.
              </Text>
            </View>
          )}
        </View>
      )}

      {walletLabel && walletFiltered.length > 0 && (
        <WalletFilteredDisclosure cards={walletFiltered} walletLabel={walletLabel} />
      )}

      {omissions.length > 0 && <OmissionsDisclosure omissions={omissions} />}

      {upside && (
        <View style={styles.upsideBox}>
          <Text style={styles.upsideText}>
            <Text style={styles.upsideStrong}>
              Earning {upside.nextBracketLabel} would open up {upside.unlocks} more card
              {upside.unlocks === 1 ? "" : "s"}.
            </Text>{" "}
            {upside.extraAnnualRM > 0
              ? `On the spending you entered, the best setup there is worth about ${rm(upside.extraAnnualRM)}/yr more than what you can get today.`
              : "On the spending you entered they wouldn't beat what you can already get, so you're not missing out yet."}
          </Text>
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

function OmissionsDisclosure({ omissions }: { omissions: CardOmission[] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.ineligibleBox}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <Text style={styles.ineligibleSummary}>Why not these cards? {open ? "▲" : "▼"}</Text>
      </Pressable>
      {open && (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          <Text style={styles.walletHint}>
            You qualify for these — here&apos;s what specifically cost them against your
            spending.
          </Text>
          {omissions.map((o) => (
            <View key={o.card.id} style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={[styles.omitAccent, { backgroundColor: o.card.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.omitName}>{o.card.name}</Text>
                <Text style={styles.ineligibleItem}>{o.reason}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function WalletFilteredDisclosure({
  cards,
  walletLabel,
}: {
  cards: RecommendationResult["walletFiltered"];
  walletLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.ineligibleBox}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <Text style={styles.ineligibleSummary}>
          {cards.length} card{cards.length === 1 ? "" : "s"} hidden (no {walletLabel} support){" "}
          {open ? "▲" : "▼"}
        </Text>
      </Pressable>
      {open && (
        <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
          <Text style={styles.walletHint}>
            You picked {walletLabel} as your wallet, so these otherwise-eligible cards were
            left out. Wallet support is derived from the card network and is indicative —
            confirm with the bank.
          </Text>
          {cards.map((c) => (
            <Text key={c.id} style={styles.ineligibleItem}>
              {c.name} — works with{" "}
              {walletsForCard(c).length === 0
                ? "no mobile wallet"
                : walletsForCard(c)
                    .map((w) => WALLET_META[w].label)
                    .join(", ")}
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
  valueNegative: { color: colors.red500 },
  warnBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.amber600,
    backgroundColor: colors.amber50,
    padding: spacing.md,
  },
  warnText: { fontSize: 13, color: colors.amber800 },
  warnStrong: { fontWeight: "700" },
  memberValueUnit: { fontSize: 11, color: colors.slate500 },
  memberUseLabel: { fontSize: 10, fontWeight: "700", color: colors.slate400, textTransform: "uppercase", marginTop: spacing.sm },
  memberCatRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  memberCatChip: { backgroundColor: colors.slate100, borderRadius: radii.full, paddingVertical: 4, paddingHorizontal: spacing.sm },
  memberCatChipText: { fontSize: 11, color: colors.slate700 },
  memberFooter: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.slate100 },
  addBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.slate300,
    backgroundColor: colors.slate100,
    padding: spacing.lg,
  },
  addTitle: { fontSize: 15, fontWeight: "800", color: colors.slate900 },
  addSubtitle: { fontSize: 13, color: colors.slate600, marginTop: spacing.xs },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  addAccent: { width: 5, height: 32, borderRadius: radii.full },
  addName: { fontSize: 14, fontWeight: "600", color: colors.slate900 },
  addMeta: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  addGain: { fontSize: 15, fontWeight: "800", color: colors.emerald600 },
  addGainUnit: { fontSize: 11, color: colors.slate500 },
  addFootnote: { fontSize: 11, color: colors.slate400, marginTop: spacing.md },
  ineligibleBox: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.slate200, backgroundColor: colors.white, padding: spacing.md },
  ineligibleSummary: { fontSize: 13, fontWeight: "600", color: colors.slate700 },
  ineligibleItem: { fontSize: 12, color: colors.slate500 },
  walletHint: { fontSize: 11, color: colors.slate400 },
  omitAccent: { width: 3, borderRadius: radii.full, marginTop: 2 },
  omitName: { fontSize: 13, fontWeight: "600", color: colors.slate900 },
  upsideBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandLight,
    backgroundColor: "#f0fdfa",
    padding: spacing.md,
  },
  upsideText: { fontSize: 13, color: colors.slate700 },
  upsideStrong: { fontWeight: "700", color: colors.slate900 },
  disclaimer: { fontSize: 11, color: colors.slate400, textAlign: "center", paddingHorizontal: spacing.md },
});
