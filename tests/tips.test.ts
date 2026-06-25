import { describe, it, expect } from "vitest";
import type { Card, Persona } from "@/lib/domain/types";
import { recommend } from "@/lib/engine/recommend";
import { buildTips } from "@/lib/engine/tips";

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

describe("buildTips — overflow routing", () => {
  // Card A: 10% groceries capped RM30 (maxes at RM300/mo spend). Card B: 5% uncapped.
  const A = makeCard({ id: "a", name: "Card A", earnRules: [{ category: "groceries", rate: 0.1, unit: "percent", monthlyCap: 30 }] });
  const B = makeCard({ id: "b", name: "Card B", earnRules: [{ category: "groceries", rate: 0.05, unit: "percent" }] });

  it("suggests moving cap overflow to a second card", () => {
    const result = recommend({ groceries: 600 }, PERSONA, [A, B]);
    const tips = buildTips(result, { groceries: 600 });
    const overflow = tips.find((t) => t.kind === "overflow" && /groceries/i.test(t.detail));
    expect(overflow).toBeTruthy();
    // 300 overflow * (5% - 0.5% base) * 12 ≈ RM162/yr
    expect(overflow!.annualGainRM).toBeGreaterThan(100);
    expect(overflow!.detail).toContain("Card B");
  });

  it("produces no overflow tip when spend stays under the cap", () => {
    const result = recommend({ groceries: 200 }, PERSONA, [A, B]);
    const tips = buildTips(result, { groceries: 200 });
    expect(tips.some((t) => t.kind === "overflow")).toBe(false);
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
});
