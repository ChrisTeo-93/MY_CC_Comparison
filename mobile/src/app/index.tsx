import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { ACTIVE_CARDS } from "@kadcompare/core";
import { colors, radii, spacing } from "@/constants/theme";
import { ScreenContainer } from "@/components/ui/screen-container";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: "🧭",
    title: "Tell us your persona",
    body: "A few quick questions about what you value — cashback, points, miles, fees and travel.",
  },
  {
    icon: "📊",
    title: "Share your spending",
    body: "Set rough monthly amounts per category. Don't know? We'll use sensible defaults.",
  },
  {
    icon: "🏆",
    title: "Get your best card(s)",
    body: "See the single best card, or the best 2–3 card combo, ranked by real ringgit value.",
  },
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.badge}>🇲🇾 Built for Malaysian spenders</Text>
        <Text style={styles.title}>
          Find the credit card that actually{" "}
          <Text style={{ color: colors.brandDark }}>pays you back</Text>
        </Text>
        <Text style={styles.lead}>
          Stop guessing from outdated forum threads. Tell us how you spend and what you
          value, and we&apos;ll recommend the card — or combo of cards — that earns you the
          most, in real ringgit.
        </Text>

        <View style={styles.ctaRow}>
          <Button label="Find my card →" onPress={() => router.push("/recommend")} />
          <Button
            label="I already have cards"
            variant="secondary"
            onPress={() => router.push("/evaluate")}
          />
        </View>
        <Text style={styles.finePrint}>
          Free · No sign-up · {ACTIVE_CARDS.length} cards compared
        </Text>
      </View>

      <View style={styles.stepsGrid}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.stepCard}>
            <Text style={styles.stepIcon}>{s.icon}</Text>
            <Text style={styles.stepNumber}>Step {i + 1}</Text>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepBody}>{s.body}</Text>
          </View>
        ))}
      </View>

      <View style={styles.fairBox}>
        <Text style={styles.fairTitle}>Cashback, points and miles — compared fairly</Text>
        <Text style={styles.fairBody}>
          We convert every reward type into ringgit value, subtract annual fees, and
          respect monthly caps — so a 5% cashback card and a 10x points card are judged on
          the same scale: how much they actually put back in your pocket.
        </Text>
      </View>

      <Text style={styles.disclaimer}>
        Card data is representative and may change. Every recommendation shows when its
        data was last verified. This tool is for comparison only, not financial advice.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.md },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.brandDark,
    backgroundColor: "#f0fdfa",
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  title: { fontSize: 30, fontWeight: "800", color: colors.slate900, textAlign: "center", lineHeight: 36 },
  lead: { fontSize: 15, color: colors.slate600, textAlign: "center", lineHeight: 22 },
  ctaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.sm },
  finePrint: { fontSize: 12, color: colors.slate500 },
  stepsGrid: { gap: spacing.md },
  stepCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  stepIcon: { fontSize: 28 },
  stepNumber: { fontSize: 12, fontWeight: "700", color: colors.brandDark, marginTop: spacing.sm },
  stepTitle: { fontSize: 16, fontWeight: "700", color: colors.slate900, marginTop: 2 },
  stepBody: { fontSize: 13, color: colors.slate600, marginTop: spacing.xs },
  fairBox: { borderRadius: radii.lg, backgroundColor: colors.slate900, padding: spacing.xl },
  fairTitle: { fontSize: 17, fontWeight: "700", color: colors.white, textAlign: "center" },
  fairBody: { fontSize: 13, color: colors.slate300, textAlign: "center", marginTop: spacing.sm, lineHeight: 19 },
  disclaimer: { fontSize: 11, color: colors.slate400, textAlign: "center" },
});
