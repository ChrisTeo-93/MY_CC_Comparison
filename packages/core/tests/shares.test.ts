import { describe, it, expect } from "vitest";
import type { Card, Persona, SpendingProfile } from "../src/domain/types";
import type { CategoryKey } from "../src/domain/categories";
import { CATEGORY_KEYS } from "../src/domain/categories";
import { applyPersonaShares, WEEKEND_SHARE } from "../src/engine/shares";
import { recommend } from "../src/engine/recommend";

function makeCard(o: Partial<Card>): Card {
  return {
    id: "c", name: "Card", bank: "Bank", network: "Visa", rewardType: "cashback",
    color: "#000", annualFee: 0, feeWaiver: { type: "always" }, minAnnualIncome: 0,
    baseRule: { category: "general", rate: 0.005, unit: "percent" }, earnRules: [],
    perks: [], lastVerified: "2026-06-25", sourceUrl: "https://example.com",
    confidence: "high", ...o,
  };
}
const PERSONA: Persona = {
  rewardPreference: "flexible", incomeBracket: "over100k", feeTolerance: "ifWorthIt",
  travelFrequency: "sometimes", effortTolerance: "multi",
};
function exactly(p: Partial<Record<CategoryKey, number>>): SpendingProfile {
  const out: SpendingProfile = {};
  for (const k of CATEGORY_KEYS) out[k] = p[k] ?? 0;
  return out;
}

const weekendCard = () =>
  makeCard({
    id: "wk",
    earnRules: [
      {
        category: "dining", rate: 0.1, unit: "percent",
        eligibleShare: 0.3, shareSource: "weekend", conditionLabel: "weekends (Sat/Sun)",
      },
    ],
  });

describe("applyPersonaShares", () => {
  it("leaves cards untouched when the user hasn't answered", () => {
    const [out] = applyPersonaShares([weekendCard()], PERSONA);
    expect(out.earnRules[0].eligibleShare).toBe(0.3);
  });

  it("replaces a weekend rule's share with the user's own answer", () => {
    for (const answer of ["weekdays", "mixed", "weekends"] as const) {
      const [out] = applyPersonaShares([weekendCard()], { ...PERSONA, weekendSpending: answer });
      expect(out.earnRules[0].eligibleShare).toBe(WEEKEND_SHARE[answer]);
    }
  });

  it("does not touch rules that aren't weekend-sourced", () => {
    const other = makeCard({
      id: "other",
      earnRules: [{ category: "dining", rate: 0.1, unit: "percent", eligibleShare: 0.4 }],
    });
    const [out] = applyPersonaShares([other], { ...PERSONA, weekendSpending: "weekends" });
    expect(out.earnRules[0].eligibleShare).toBe(0.4);
  });

  it("does not mutate the input cards", () => {
    const card = weekendCard();
    applyPersonaShares([card], { ...PERSONA, weekendSpending: "weekends" });
    expect(card.earnRules[0].eligibleShare).toBe(0.3);
  });
});

describe("recommend — weekend answer changes what a weekend card is worth", () => {
  const spending = exactly({ dining: 2000 });

  it("values a weekend-only card higher for a weekend spender", () => {
    const low = recommend(spending, { ...PERSONA, weekendSpending: "weekdays" }, [weekendCard()]);
    const high = recommend(spending, { ...PERSONA, weekendSpending: "weekends" }, [weekendCard()]);
    expect(high.single[0].grossAnnualRM).toBeGreaterThan(low.single[0].grossAnnualRM);
    // 15% vs 50% of RM2,000 at 10%, the rest at the 0.5% base.
    expect(low.single[0].grossAnnualRM).toBeCloseTo((2000 * 0.15 * 0.1 + 2000 * 0.85 * 0.005) * 12);
    expect(high.single[0].grossAnnualRM).toBeCloseTo((2000 * 0.5 * 0.1 + 2000 * 0.5 * 0.005) * 12);
  });

  it("surfaces the user's own share in the conditions panel, not a card average", () => {
    const r = recommend(spending, { ...PERSONA, weekendSpending: "weekends" }, [weekendCard()]);
    const cond = r.single[0].conditions.earn.find((e) => e.category === "dining")!;
    expect(cond.eligibleShare).toBe(0.5);
    expect(cond.conditionLabel).toBe("weekends (Sat/Sun)");
  });
});
