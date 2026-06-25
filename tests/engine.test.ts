import { describe, it, expect } from "vitest";
import type { Card, Persona } from "@/lib/domain/types";
import { rmValuePerRM } from "@/lib/engine/normalize";
import {
  categoryValue,
  effectiveAnnualFee,
  personaMultiplier,
  scoreCard,
} from "@/lib/engine/score";
import { bestCombo } from "@/lib/engine/combo";
import { recommend } from "@/lib/engine/recommend";

// --- helpers ---------------------------------------------------------------

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: "test",
    name: "Test Card",
    bank: "Test Bank",
    network: "Visa",
    rewardType: "cashback",
    color: "#000000",
    annualFee: 0,
    feeWaiver: { type: "always" },
    minAnnualIncome: 0,
    earnRules: [],
    baseRule: { category: "general", rate: 0.005, unit: "percent" },
    perks: [],
    lastVerified: "2026-01-01",
    sourceUrl: "https://example.com",
    confidence: "high",
    ...overrides,
  };
}

const PERSONA: Persona = {
  rewardPreference: "flexible",
  incomeBracket: "over100k",
  feeTolerance: "ifWorthIt",
  travelFrequency: "sometimes",
  effortTolerance: "multi",
};

// --- normalize -------------------------------------------------------------

describe("rmValuePerRM", () => {
  it("returns the rate as-is for percent rules", () => {
    const card = makeCard({});
    expect(rmValuePerRM(card, { category: "general", rate: 0.05, unit: "percent" })).toBe(0.05);
  });

  it("multiplies points by point value", () => {
    const card = makeCard({ rewardType: "points", pointValueRM: 0.01 });
    expect(rmValuePerRM(card, { category: "online", rate: 5, unit: "pointsPerRM" })).toBeCloseTo(0.05);
  });

  it("multiplies miles by mile value", () => {
    const card = makeCard({ rewardType: "miles", mileValueRM: 0.045 });
    expect(rmValuePerRM(card, { category: "travel", rate: 2, unit: "milesPerRM" })).toBeCloseTo(0.09);
  });
});

// --- categoryValue ---------------------------------------------------------

describe("categoryValue", () => {
  const card = makeCard({
    baseRule: { category: "general", rate: 0.005, unit: "percent" },
    earnRules: [
      { category: "groceries", rate: 0.05, unit: "percent", monthlyCap: 30 },
    ],
  });

  it("computes uncapped annual value", () => {
    // 500 * 5% = RM25/mo, under the RM30 cap.
    const b = categoryValue(card, "groceries", 500, 500);
    expect(b.capped).toBe(false);
    expect(b.annualValueRM).toBeCloseTo(25 * 12);
  });

  it("applies the monthly cap and falls back to base for overflow", () => {
    // 700 * 5% = RM35 > RM30 cap. RM600 of spend hits the cap; RM100 overflow
    // earns the base 0.5% = RM0.50. Monthly = 30.50 => annual 366.
    const b = categoryValue(card, "groceries", 700, 700);
    expect(b.capped).toBe(true);
    expect(b.annualValueRM).toBeCloseTo(30.5 * 12);
  });

  it("falls back to base rate when a min-spend unlock is not met", () => {
    const gated = makeCard({
      earnRules: [
        { category: "groceries", rate: 0.08, unit: "percent", minMonthlySpend: 1000 },
      ],
    });
    // Total monthly 500 < 1000, so the 8% rule does not apply; base 0.5% used.
    const b = categoryValue(gated, "groceries", 500, 500);
    expect(b.annualValueRM).toBeCloseTo(500 * 0.005 * 12);
  });
});

// --- fee waiver ------------------------------------------------------------

describe("effectiveAnnualFee", () => {
  it("is zero when there is no fee", () => {
    expect(effectiveAnnualFee(makeCard({ annualFee: 0 }), 0)).toBe(0);
  });

  it("waives 'always' cards", () => {
    expect(effectiveAnnualFee(makeCard({ annualFee: 195, feeWaiver: { type: "always" } }), 0)).toBe(0);
  });

  it("always charges 'none' cards", () => {
    expect(effectiveAnnualFee(makeCard({ annualFee: 800, feeWaiver: { type: "none" } }), 999999)).toBe(800);
  });

  it("waives spend-threshold cards only above the threshold", () => {
    const card = makeCard({ annualFee: 195, feeWaiver: { type: "spend", threshold: 12000 } });
    expect(effectiveAnnualFee(card, 10000)).toBe(195);
    expect(effectiveAnnualFee(card, 15000)).toBe(0);
  });
});

// --- persona multiplier ----------------------------------------------------

describe("personaMultiplier", () => {
  it("boosts cards matching the reward preference", () => {
    const card = makeCard({ rewardType: "cashback" });
    const pref: Persona = { ...PERSONA, rewardPreference: "cashback" };
    expect(personaMultiplier(card, pref, 0)).toBeGreaterThan(1);
  });

  it("penalises cards that miss the reward preference", () => {
    const card = makeCard({ rewardType: "miles" });
    const pref: Persona = { ...PERSONA, rewardPreference: "cashback" };
    expect(personaMultiplier(card, pref, 0)).toBeLessThan(1);
  });

  it("is neutral for flexible preference", () => {
    const card = makeCard({ rewardType: "miles" });
    expect(personaMultiplier(card, PERSONA, 0)).toBe(1);
  });

  it("penalises fee cards harder when the fee actually bites", () => {
    const card = makeCard({ annualFee: 200 });
    const noFee: Persona = { ...PERSONA, rewardPreference: "flexible", feeTolerance: "noFee" };
    expect(personaMultiplier(card, noFee, 200)).toBeLessThan(personaMultiplier(card, noFee, 0));
  });
});

// --- scoreCard eligibility -------------------------------------------------

describe("scoreCard", () => {
  it("marks cards above the income requirement ineligible", () => {
    const premium = makeCard({ minAnnualIncome: 120000 });
    const lowIncome: Persona = { ...PERSONA, incomeBracket: "under36k" };
    expect(scoreCard(premium, {}, lowIncome).eligible).toBe(false);
    expect(scoreCard(premium, {}, PERSONA).eligible).toBe(true);
  });

  it("nets the effective fee out of gross value", () => {
    const card = makeCard({
      annualFee: 120,
      feeWaiver: { type: "none" },
      earnRules: [{ category: "general", rate: 0.01, unit: "percent" }],
    });
    const s = scoreCard(card, { general: 1000 }, PERSONA);
    expect(s.netAnnualRM).toBeCloseTo(s.grossAnnualRM - 120);
  });
});

// --- combo -----------------------------------------------------------------

describe("bestCombo", () => {
  const groceriesCard = makeCard({
    id: "gro",
    earnRules: [{ category: "groceries", rate: 0.08, unit: "percent" }],
  });
  const petrolCard = makeCard({
    id: "pet",
    earnRules: [{ category: "petrol", rate: 0.08, unit: "percent" }],
  });
  const spending = { groceries: 600, petrol: 600, general: 0 };

  it("combines complementary cards and routes each category to its best earner", () => {
    const scores = [groceriesCard, petrolCard].map((c) => scoreCard(c, spending, PERSONA));
    const combo = bestCombo(scores, spending, PERSONA);
    expect(combo.members).toHaveLength(2);
    const groMember = combo.members.find((m) => m.card.id === "gro")!;
    const petMember = combo.members.find((m) => m.card.id === "pet")!;
    expect(groMember.assignedCategories).toContain("groceries");
    expect(petMember.assignedCategories).toContain("petrol");
  });

  it("does not add a card whose marginal value cannot cover its fee", () => {
    const expensiveDud = makeCard({
      id: "dud",
      annualFee: 5000,
      feeWaiver: { type: "none" },
      earnRules: [{ category: "groceries", rate: 0.081, unit: "percent" }],
    });
    const scores = [groceriesCard, expensiveDud].map((c) => scoreCard(c, spending, PERSONA));
    const combo = bestCombo(scores, spending, PERSONA);
    expect(combo.members.some((m) => m.card.id === "dud")).toBe(false);
  });
});

// --- recommend (integration) ----------------------------------------------

describe("recommend", () => {
  it("returns eligible cards sorted by adjusted net value, plus an ineligible list", () => {
    const result = recommend(
      { dining: 500, groceries: 600, petrol: 400 },
      { ...PERSONA, incomeBracket: "under36k" },
    );
    // sorted descending
    for (let i = 1; i < result.single.length; i++) {
      expect(result.single[i - 1].adjustedNetRM).toBeGreaterThanOrEqual(
        result.single[i].adjustedNetRM,
      );
    }
    // a low income bracket should exclude the high-income premium miles cards
    expect(result.ineligible.length).toBeGreaterThan(0);
    // every eligible card is genuinely eligible
    expect(result.single.every((s) => s.eligible)).toBe(true);
  });
});
