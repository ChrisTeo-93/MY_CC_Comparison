import { describe, it, expect } from "vitest";
import { CATEGORY_KEYS, type CategoryKey } from "../src/domain/categories";
import type { Card } from "../src/domain/types";
import { buildConditions } from "../src/engine/conditions";

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: "test",
    name: "Test Card",
    bank: "Test Bank",
    network: "Visa",
    rewardType: "cashback",
    color: "#000",
    annualFee: 0,
    feeWaiver: { type: "always" },
    minAnnualIncome: 0,
    baseRule: { category: "general", rate: 0.002, unit: "percent" },
    earnRules: [],
    perks: [],
    lastVerified: "2026-06-25",
    sourceUrl: "https://example.com",
    confidence: "high",
    ...overrides,
  };
}

function resolved(partial: Partial<Record<CategoryKey, number>>): Record<CategoryKey, number> {
  const r = {} as Record<CategoryKey, number>;
  for (const k of CATEGORY_KEYS) r[k] = partial[k] ?? 0;
  return r;
}

describe("buildConditions — spend thresholds", () => {
  const card = makeCard({
    earnRules: [
      { category: "groceries", rate: 0.05, unit: "percent", monthlyCap: 30, minMonthlySpend: 3000 },
    ],
  });

  it("computes the spend needed to max the cap", () => {
    const c = buildConditions(card, resolved({ groceries: 600 }), 4000);
    const g = c.earn[0];
    expect(g.maxMonthlyRewardRM).toBe(30);
    // RM30 cap at 5% => need RM600/mo grocery spend
    expect(g.spendToMaxRM).toBeCloseTo(600);
  });

  it("marks the rule unlocked when total spend meets the minimum", () => {
    const c = buildConditions(card, resolved({ groceries: 600 }), 4000);
    expect(c.earn[0].unlocked).toBe(true);
  });

  it("marks the rule locked when total spend is below the minimum", () => {
    const c = buildConditions(card, resolved({ groceries: 600 }), 2000);
    expect(c.earn[0].unlocked).toBe(false);
    expect(c.earn[0].minTotalSpendRM).toBe(3000);
  });

  it("detects when the user already maxes the cap", () => {
    const atCap = buildConditions(card, resolved({ groceries: 600 }), 4000);
    expect(atCap.earn[0].hitsCap).toBe(true);
    const underCap = buildConditions(card, resolved({ groceries: 200 }), 4000);
    expect(underCap.earn[0].hitsCap).toBe(false);
  });
});

describe("buildConditions — points cap conversion", () => {
  it("converts a points cap into the RM spend needed to reach it", () => {
    const card = makeCard({
      rewardType: "points",
      pointValueRM: 0.002,
      earnRules: [{ category: "online", rate: 8, unit: "pointsPerRM", monthlyCap: 3000 }],
    });
    const c = buildConditions(card, resolved({ online: 500 }), 3000);
    const o = c.earn[0];
    // cap 3000 pts * RM0.002 = RM6 ; rate 8 * 0.002 = RM0.016/RM ; RM6 / 0.016 = RM375
    expect(o.maxMonthlyRewardRM).toBeCloseTo(6);
    expect(o.spendToMaxRM).toBeCloseTo(375);
  });
});

describe("buildConditions — fee waiver", () => {
  it("reports a free card", () => {
    const c = buildConditions(makeCard({}), resolved({}), 1000);
    expect(c.fee.kind).toBe("free");
    expect(c.fee.met).toBe(true);
  });

  it("reports a spend waiver as met when annual spend clears the threshold", () => {
    const card = makeCard({ annualFee: 195, feeWaiver: { type: "spend", threshold: 20000 } });
    const met = buildConditions(card, resolved({}), 2000); // 2000*12 = 24000 >= 20000
    expect(met.fee.kind).toBe("waivable");
    expect(met.fee.met).toBe(true);
    expect(met.fee.text).toContain("Waive");
  });

  it("reports a spend waiver as unmet when annual spend is short", () => {
    const card = makeCard({ annualFee: 195, feeWaiver: { type: "spend", threshold: 20000 } });
    const unmet = buildConditions(card, resolved({}), 1000); // 12000 < 20000
    expect(unmet.fee.met).toBe(false);
  });

  it("reports a non-waivable fee", () => {
    const card = makeCard({ annualFee: 800, feeWaiver: { type: "none" } });
    const c = buildConditions(card, resolved({}), 5000);
    expect(c.fee.kind).toBe("fixed");
    expect(c.fee.met).toBe(false);
  });

  it("mentions the mandatory govt service tax regardless of bank fee/waiver state", () => {
    const c = buildConditions(makeCard({}), resolved({}), 1000);
    expect(c.fee.govtTaxRM).toBe(25);
    expect(c.fee.text).toContain("RM25/year government service tax");
  });

  it("respects a card-level govt tax override", () => {
    const c = buildConditions(makeCard({ govtTaxRM: 0 }), resolved({}), 1000);
    expect(c.fee.govtTaxRM).toBe(0);
    expect(c.fee.text).toContain("RM0/year government service tax");
  });
});
