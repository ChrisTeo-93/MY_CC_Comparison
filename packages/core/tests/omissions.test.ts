import { describe, it, expect } from "vitest";
import type { Card, Persona, SpendingProfile } from "../src/domain/types";
import type { CategoryKey } from "../src/domain/categories";
import { CATEGORY_KEYS } from "../src/domain/categories";
import { recommend } from "../src/engine/recommend";
import { explainOmissions, incomeUpside } from "../src/engine/omissions";

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

describe("explainOmissions", () => {
  const winner = makeCard({
    id: "winner", name: "Winner",
    earnRules: [{ category: "groceries", rate: 0.1, unit: "percent" }],
  });
  const spending = exactly({ groceries: 1000 });

  it("blames the fee when a card cannot cover it", () => {
    const pricey = makeCard({
      id: "pricey", name: "Pricey", annualFee: 500, feeWaiver: { type: "none" },
      earnRules: [{ category: "groceries", rate: 0.01, unit: "percent" }],
    });
    const r = recommend(spending, PERSONA, [winner, pricey]);
    const o = explainOmissions(r, spending).find((x) => x.card.id === "pricey");
    expect(o).toBeTruthy();
    expect(o!.reason).toContain("RM500 annual fee");
  });

  it("blames an unreachable min-spend gate", () => {
    const gated = makeCard({
      id: "gated", name: "Gated",
      earnRules: [{ category: "groceries", rate: 0.2, unit: "percent", minMonthlySpend: 8000 }],
    });
    const r = recommend(spending, PERSONA, [winner, gated]);
    const o = explainOmissions(r, spending).find((x) => x.card.id === "gated");
    expect(o!.reason).toContain("RM8,000/month");
  });

  it("blames a cap the user's spending blows past", () => {
    const tiny = makeCard({
      id: "tiny", name: "Tiny",
      earnRules: [{ category: "groceries", rate: 0.2, unit: "percent", monthlyCap: 5 }],
    });
    const r = recommend(spending, PERSONA, [winner, tiny]);
    const o = explainOmissions(r, spending).find((x) => x.card.id === "tiny");
    expect(o!.reason).toContain("stops at RM5/month");
  });

  it("falls back to the plain margin when nothing specific is wrong", () => {
    const weaker = makeCard({
      id: "weaker", name: "Weaker",
      earnRules: [{ category: "groceries", rate: 0.02, unit: "percent" }],
    });
    const r = recommend(spending, PERSONA, [winner, weaker]);
    const o = explainOmissions(r, spending).find((x) => x.card.id === "weaker");
    expect(o!.reason).toMatch(/less than the recommendation|edges it out/);
  });

  it("never explains a card that IS in the combo", () => {
    const r = recommend({ dining: 800, groceries: 900, online: 700 }, PERSONA);
    const inCombo = new Set(r.combo.members.map((m) => m.card.id));
    for (const o of explainOmissions(r, { dining: 800, groceries: 900, online: 700 })) {
      expect(inCombo.has(o.card.id)).toBe(false);
    }
  });
});

describe("incomeUpside", () => {
  const cheap = makeCard({ id: "cheap", name: "Cheap", minAnnualIncome: 0,
    earnRules: [{ category: "groceries", rate: 0.02, unit: "percent" }] });
  const premium = makeCard({ id: "premium", name: "Premium", minAnnualIncome: 100000,
    earnRules: [{ category: "groceries", rate: 0.2, unit: "percent" }] });
  const spending = exactly({ groceries: 2000 });

  it("reports what the next bracket unlocks and what it is worth", () => {
    const up = incomeUpside(spending, { ...PERSONA, incomeBracket: "60to100k" }, [cheap, premium]);
    expect(up).toBeTruthy();
    expect(up!.nextBracket).toBe("over100k");
    expect(up!.unlocks).toBe(1);
    expect(up!.extraAnnualRM).toBeGreaterThan(0);
  });

  it("returns null at the top bracket", () => {
    expect(incomeUpside(spending, PERSONA, [cheap, premium])).toBeNull();
  });

  it("returns null when moving up unlocks nothing", () => {
    expect(incomeUpside(spending, { ...PERSONA, incomeBracket: "under36k" }, [cheap])).toBeNull();
  });
});
