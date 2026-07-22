import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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

const ALL_BANKS = "__all__";

export function StepOwnedCards({ owned, onToggle, onBack, onSubmit }: StepOwnedCardsProps) {
  const set = new Set(owned);
  const [query, setQuery] = useState("");
  const [bank, setBank] = useState<string>(ALL_BANKS);

  const banks = useMemo(
    () => Array.from(new Set(ACTIVE_CARDS.map((c) => c.bank))).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACTIVE_CARDS.filter((c) => {
      if (bank !== ALL_BANKS && c.bank !== bank) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.bank.toLowerCase().includes(q);
    });
  }, [query, bank]);

  const groups = useMemo(() => {
    const byBank = new Map<string, typeof ACTIVE_CARDS>();
    for (const c of filtered) {
      const list = byBank.get(c.bank) ?? [];
      list.push(c);
      byBank.set(c.bank, list);
    }
    return Array.from(byBank.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.header}>
        <Text style={styles.title}>Which cards do you already have?</Text>
        <Text style={styles.subtitle}>
          Search or filter by bank, then pick the cards you hold. We&apos;ll show what
          you&apos;re earning and where you can do better.
        </Text>
      </View>

      {owned.length > 0 && (
        <Text style={styles.selectedCount}>
          {owned.length} card{owned.length === 1 ? "" : "s"} selected
        </Text>
      )}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="🔍  Search cards or banks…"
        placeholderTextColor={colors.slate400}
        style={styles.search}
        autoCorrect={false}
        accessibilityLabel="Search cards or banks"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <BankChip label="All banks" active={bank === ALL_BANKS} onPress={() => setBank(ALL_BANKS)} />
        {banks.map((b) => (
          <BankChip key={b} label={b} active={bank === b} onPress={() => setBank(b)} />
        ))}
      </ScrollView>

      {groups.length === 0 ? (
        <Text style={styles.noMatch}>No cards match “{query}”. Try a different search or bank.</Text>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {groups.map(([bankName, cards]) => (
            <View key={bankName} style={{ gap: spacing.sm }}>
              <Text style={styles.groupLabel}>{bankName}</Text>
              {cards.map((card) => {
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
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardName}>{card.name}</Text>
                        <Text style={styles.cardMeta}>
                          {card.network} · {REWARD_LABEL[card.rewardType]}
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
          ))}
        </View>
      )}

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

function BankChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipOn]}
    >
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "800", color: colors.slate900, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.slate600, textAlign: "center" },
  selectedCount: { fontSize: 13, fontWeight: "600", color: colors.brandDark, textAlign: "center" },
  search: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.slate900,
  },
  chipRow: { gap: spacing.sm, paddingRight: spacing.md },
  chip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  chipOn: { borderColor: colors.brandDark, backgroundColor: colors.brandDark },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.slate600 },
  chipTextOn: { color: colors.white },
  noMatch: {
    fontSize: 13,
    color: colors.slate500,
    textAlign: "center",
    backgroundColor: colors.slate100,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  groupLabel: { fontSize: 11, fontWeight: "700", color: colors.slate400, textTransform: "uppercase" },
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
