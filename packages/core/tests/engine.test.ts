import { describe, it, expect } from "vitest";
import type { Card, Persona } from "../src/domain/types";
import { govtServiceTax, rmValuePerRM, STANDARD_GOVT_SERVICE_TAX_RM } from "../src/engine/normalize";
import {
  categoryValue,
  effectiveAnnualFee,
  personaMultiplier,
  ruleForCategory,
  scoreCard,
} from "../src/engine/score";
import { bestCombo } from "../src/engine/combo";
import { recommend } from "../src/engine/recommend";
import { CARD_BY_ID } from "../src/domain/cards";

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
      govtTaxRM: 0, // isolate: this test is about the bank fee, not govt tax
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

// --- government service tax (SST) -------------------------------------------

describe("govtServiceTax", () => {
  it("defaults to the standard RM25/year when unset", () => {
    expect(govtServiceTax(makeCard({}))).toBe(STANDARD_GOVT_SERVICE_TAX_RM);
    expect(STANDARD_GOVT_SERVICE_TAX_RM).toBe(25);
  });

  it("respects a card-level override", () => {
    expect(govtServiceTax(makeCard({ govtTaxRM: 0 }))).toBe(0);
    expect(govtServiceTax(makeCard({ govtTaxRM: 10 }))).toBe(10);
  });
});

describe("scoreCard — govt service tax", () => {
  it("subtracts the govt tax from net value even for a free card", () => {
    const freeCard = makeCard({ annualFee: 0, feeWaiver: { type: "always" } });
    const s = scoreCard(freeCard, { general: 1000 }, PERSONA);
    expect(s.govtTaxRM).toBe(25);
    expect(s.netAnnualRM).toBeCloseTo(s.grossAnnualRM - 25);
  });

  it("does not feed the govt tax into the persona no-fee tie-break", () => {
    // A genuinely free card (bank fee RM0, only the unwaivable govt tax) should
    // NOT be penalised by the "no fees, please" persona multiplier — that signal
    // is about the bank's own fee-charging behaviour, not a uniform govt charge.
    const freeCard = makeCard({ annualFee: 0, feeWaiver: { type: "always" } });
    const noFeePersona: Persona = { ...PERSONA, feeTolerance: "noFee" };
    const s = scoreCard(freeCard, { general: 1000 }, noFeePersona);
    expect(s.adjustedNetRM).toBeCloseTo(s.netAnnualRM); // multiplier stayed 1
  });
});

describe("bestCombo — govt service tax", () => {
  // Scoped to "groceries" specifically (not "general", which is a blanket
  // boost applied to every category by design) so it doesn't also dominate
  // the dining category the candidate cards compete on below.
  const seed = makeCard({
    id: "seed",
    govtTaxRM: 0,
    earnRules: [{ category: "groceries", rate: 0.05, unit: "percent" }],
  });
  const spending = { general: 1000, dining: 100 };

  it("excludes a candidate whose marginal earnings clear its bank fee but not the RM25 govt tax", () => {
    // Marginal gross: 100/mo * 1.5% * 12 = RM18/yr — positive vs a RM0 bank fee,
    // but RM18 - RM25 govt tax < 0, so this card should NOT be added.
    const marginalDud = makeCard({
      id: "marginal-dud",
      earnRules: [{ category: "dining", rate: 0.015, unit: "percent" }],
    });
    const scores = [seed, marginalDud].map((c) => scoreCard(c, spending, PERSONA));
    const combo = bestCombo(scores, spending, PERSONA);
    expect(combo.members.some((m) => m.card.id === "marginal-dud")).toBe(false);
  });

  it("still adds a candidate whose marginal earnings clear both the fee and the govt tax", () => {
    // Marginal gross: 100/mo * 3% * 12 = RM36/yr — clears the RM25 govt tax.
    const worthwhile = makeCard({
      id: "worthwhile",
      earnRules: [{ category: "dining", rate: 0.03, unit: "percent" }],
    });
    const scores = [seed, worthwhile].map((c) => scoreCard(c, spending, PERSONA));
    const combo = bestCombo(scores, spending, PERSONA);
    const member = combo.members.find((m) => m.card.id === "worthwhile");
    expect(member).toBeTruthy();
    expect(combo.totalGovtTaxRM).toBe(0 + 25); // seed's 0 override + worthwhile's default 25
  });
});

// --- category exclusions ----------------------------------------------------

describe("ruleForCategory — excludedCategories", () => {
  const card = makeCard({
    earnRules: [
      {
        category: "general",
        rate: 0.05,
        unit: "percent",
        excludedCategories: ["ewallet", "bills"],
      },
    ],
    baseRule: { category: "general", rate: 0.0025, unit: "percent" },
  });

  it("falls back to the base rate for an excluded category", () => {
    expect(ruleForCategory(card, "ewallet", 1000)).toBe(card.baseRule);
    expect(ruleForCategory(card, "bills", 1000)).toBe(card.baseRule);
  });

  it("still applies the general rule for a non-excluded category", () => {
    expect(ruleForCategory(card, "dining", 1000)).toBe(card.earnRules[0]);
    expect(ruleForCategory(card, "groceries", 1000)).toBe(card.earnRules[0]);
  });

  it("a general rule with no excludedCategories applies everywhere (unrestricted)", () => {
    const unrestricted = makeCard({
      earnRules: [{ category: "general", rate: 0.05, unit: "percent" }],
    });
    expect(ruleForCategory(unrestricted, "ewallet", 1000)).toBe(unrestricted.earnRules[0]);
  });
});

describe("scoreCard — excludedCategories (regression against real card data)", () => {
  it("Maybank 2 Gold: e-wallet/bills spend earns only the base rate, not the 5% weekend bonus", () => {
    const card = CARD_BY_ID["maybank-2-gold"];
    expect(card).toBeTruthy();
    const s = scoreCard(card, { ewallet: 500, bills: 500, dining: 500 }, PERSONA);
    const ewallet = s.breakdown.find((b) => b.category === "ewallet")!;
    const bills = s.breakdown.find((b) => b.category === "bills")!;
    const dining = s.breakdown.find((b) => b.category === "dining")!;
    // base rate 0.25% * 500 * 12 = RM15/yr — NOT the 5% bonus rate.
    expect(ewallet.annualValueRM).toBeCloseTo(15);
    expect(bills.annualValueRM).toBeCloseTo(15);
    expect(ewallet.rateLabel).not.toContain("5%");
    expect(bills.rateLabel).not.toContain("5%");
    // dining isn't excluded, so it gets the 5% bonus rate.
    expect(dining.rateLabel).toContain("5%");
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
