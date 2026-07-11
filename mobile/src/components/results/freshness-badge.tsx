import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { freshnessStatus } from "@kadcompare/core";
import type { DataConfidence } from "@kadcompare/core";
import { colors, radii, spacing } from "@/constants/theme";

const LEVEL_COLOR: Record<string, string> = {
  fresh: colors.emerald600,
  aging: colors.amber600,
  stale: colors.red500,
};

/** Colour-coded "how fresh is this card's data" badge — opens the source URL. */
export function FreshnessBadge({ date, href }: { date: string; href?: string }) {
  const f = freshnessStatus(date);
  const color = LEVEL_COLOR[f.level];
  const glyph = f.level === "stale" ? "⚠" : "🕒";

  return (
    <Pressable onPress={() => href && Linking.openURL(href)} disabled={!href}>
      <Text style={[styles.text, { color }]}>
        {glyph} {f.label}
      </Text>
    </Pressable>
  );
}

const CONFIDENCE_STYLE: Record<DataConfidence, { label: string; bg: string; fg: string }> = {
  high: { label: "high confidence", bg: colors.emerald100, fg: colors.emerald700 },
  medium: { label: "medium confidence", bg: colors.amber100, fg: colors.amber700 },
  low: { label: "low confidence", bg: colors.red100, fg: colors.red600 },
};

/** Shows how much to trust a card's figures, paired with the freshness badge. */
export function ConfidenceChip({ level }: { level: DataConfidence }) {
  const s = CONFIDENCE_STYLE[level];
  return (
    <Text style={[styles.chip, { backgroundColor: s.bg, color: s.fg }]}>{s.label}</Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 12, fontWeight: "600" },
  chip: {
    fontSize: 11,
    fontWeight: "600",
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    overflow: "hidden",
  },
});
