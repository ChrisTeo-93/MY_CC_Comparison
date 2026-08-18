import { describe, it, expect } from "vitest";
import type { Card, Persona, SpendingProfile } from "../src/domain/types";
import type { CategoryKey } from "../src/domain/categories";
import { CATEGORY_KEYS } from "../src/domain/categories";
import { recommend } from "../src/engine/recommend";
import { buildTips } from "../src/engine/tips";

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: "c",
    name: "Card",
    bank: "Bank",
    network: "Visa",
    rewardType: "cashback",
    color: "#000",
    annualFee: 0,
    feeWaiver: { type: "always" },
    minAnnualIncome: 0,
    baseRule: { category: "general", rate: 0.005, unit: "percent" },
    earnRules: [],
    perks: [],
    lastVerified: "2026-06-25",
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

/** Explicit 0 for every unnamed category, so none falls back to its default. */
function exactly(profile: Partial<Record<CategoryKey, number>>): SpendingProfile {
  const out: SpendingProfile = {};
  for (const k of CATEGORY_KEYS) out[k] = profile[k] ?? 0;
  return out;
}

describe("buildTips — overflow routing", () => {
  // A: 10% groceries capped RM50/mo, so its bonus maxes out at RM500/mo spend.
  // B: weaker on groceries but strong on dining, which is what earns it a place
  //    in the combo — giving the overflow somewhere legitimate to go.
  const A = makeCard({
    id: "a",
    name: "Card A",
    earnRules: [{ category: "groceries", rate: 0.1, unit: "percent", monthlyCap: 50 }],
  });
  const B = makeCard({
    id: "b",
    name: "Card B",
    earnRules: [
      { category: "groceries", rate: 0.05, unit: "percent" },
      { category: "dining", rate: 0.08, unit: "percent" },
    ],
  });
  const spending = exactly({ groceries: 900, dining: 500 });

  it("suggests moving cap overflow to another card in the combo", () => {
    const result = recommend(spending, PERSONA, [A, B]);
    // Guard the premise: without a genuine 2-card combo this test proves nothing.
    expect(result.combo.members.map((m) => m.card.id).sort()).toEqual(["a", "b"]);

    const tips = buildTips(result, spending);
    const overflow = tips.find((t) => t.kind === "overflow" && /grocer/i.test(t.detail));
    expect(overflow).toBeTruthy();
    // 400 overflow * (5% - 0.5% base) * 12 ≈ RM216/yr
    expect(overflow!.annualGainRM).toBeGreaterThan(100);
    expect(overflow!.detail).toContain("Card A"); // the card holding groceries
    expect(overflow!.detail).toContain("Card B"); // where the overflow should go
  });

  it("produces no overflow tip when spend stays under the cap", () => {
    const under = exactly({ groceries: 200, dining: 500 });
    const result = recommend(under, PERSONA, [A, B]);
    const tips = buildTips(result, under);
    expect(tips.some((t) => t.kind === "overflow")).toBe(false);
  });

  it("gives no overflow tip when the combo is a single card", () => {
    // Nothing to split onto: suggesting a second card here would contradict the
    // recommendation the user is looking at.
    const solo = exactly({ groceries: 900 });
    const result = recommend(solo, PERSONA, [A]);
    expect(result.combo.members).toHaveLength(1);
    expect(buildTips(result, solo).some((t) => t.kind === "overflow")).toBe(false);
  });
});

describe("buildTips — fee-waiver near-miss", () => {
  it("flags a card whose fee waiver is just out of reach", () => {
    const C = makeCard({
      id: "c1",
      name: "Premium Card",
      annualFee: 150,
      feeWaiver: { type: "spend", threshold: 48000 },
    });
    // Default spending totals ~RM3,350/mo => ~RM40,200/yr, short of RM48k but within 25%.
    const result = recommend({}, PERSONA, [C]);
    const tips = buildTips(result, {});
    const waiver = tips.find((t) => t.kind === "waiver");
    expect(waiver).toBeTruthy();
    expect(waiver!.detail).toContain("Premium Card");
  });

  it("measures the shortfall against the spend routed to that card, not the whole profile", () => {
    // Lead card soaks up everything except dining; the premium card only ever
    // receives dining spend, so its waiver is far out of reach — even though the
    // user's TOTAL spend clears the threshold outright.
    const lead = makeCard({
      id: "lead",
      name: "Lead Card",
      earnRules: [{ category: "groceries", rate: 0.08, unit: "percent" }],
    });
    const premium = makeCard({
      id: "premium",
      name: "Premium Card",
      annualFee: 150,
      feeWaiver: { type: "spend", threshold: 48000 },
      earnRules: [{ category: "dining", rate: 0.2, unit: "percent" }],
    });
    // Total RM3,750/mo = RM45,000/yr — only RM3,000 short of the threshold, so
    // measured against the whole profile this looks like a tempting near miss.
    const spending = exactly({ groceries: 3250, dining: 500 });
    const result = recommend(spending, PERSONA, [lead, premium]);
    expect(result.combo.members.map((m) => m.card.id).sort()).toEqual(["lead", "premium"]);

    // But the combo only routes dining to it: RM500/mo = RM6,000/yr, leaving it
    // RM42,000 short. Telling the user they are "RM3,000 away" would be wrong by
    // more than an order of magnitude.
    const waiver = buildTips(result, spending).find((t) => t.kind === "waiver");
    expect(waiver).toBeUndefined();
  });
});

describe("buildTips — scoped to the recommended combo", () => {
  it("still produces tips, and names only cards inside the combo", () => {
    const spending = { dining: 800, groceries: 900, petrol: 600, online: 700, bills: 500 };
    const result = recommend(spending, PERSONA); // full catalogue
    const tips = buildTips(result, spending);

    const inCombo = new Set(result.combo.members.map((m) => m.card.name));
    const outside = result.single.map((s) => s.card.name).filter((n) => !inCombo.has(n));
    // Guard both premises, so the test can never pass vacuously.
    expect(tips.length).toBeGreaterThan(0);
    expect(outside.length).toBeGreaterThan(0);

    for (const tip of tips) {
      const text = `${tip.title} ${tip.detail}`;
      for (const name of outside) {
        expect(text, `tip must not name non-combo card "${name}"`).not.toContain(name);
      }
    }
  });

  it("drops a tip built around a highly-ranked card the combo left out", () => {
    // Regression for the reported case: tips drew on the top-ranked single
    // cards as well as the combo, so a user recommended three Maybank cards was
    // told "RHB Shell maxes out around RM250/mo here — put the extra on ..." —
    // advice resting on a card they were never told to get.
    const persona: Persona = {
      rewardPreference: "cashback",
      incomeBracket: "over100k",
      feeTolerance: "noFee",
      travelFrequency: "never",
      effortTolerance: "single",
      walletPreference: "any",
    };
    const result = recommend({}, persona); // full catalogue, default spending
    const inCombo = new Set(result.combo.members.map((m) => m.card.id));
    // Premise, derived rather than hardcoded: some well-ranked card sits outside
    // the combo. Which card that is shifts as the catalogue changes.
    const outsider = result.single.slice(0, 6).find((s) => !inCombo.has(s.card.id));
    expect(outsider, "expected a top-ranked card outside the combo").toBeTruthy();

    for (const tip of buildTips(result, {})) {
      expect(`${tip.title} ${tip.detail}`).not.toContain(outsider!.card.name);
    }
  });
});
