import { describe, it, expect } from "vitest";
import { validateCard, getAllCards } from "@/lib/data/cardStore";
import type { Card } from "@kadcompare/core";

function validCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "test-card",
    name: "Test Card",
    bank: "Test Bank",
    network: "Visa",
    rewardType: "cashback",
    color: "#2563eb",
    annualFee: 0,
    feeWaiver: { type: "always" },
    minAnnualIncome: 24000,
    baseRule: { category: "general", rate: 0.005, unit: "percent" },
    earnRules: [{ category: "groceries", rate: 0.05, unit: "percent", monthlyCap: 30 }],
    perks: ["No annual fee"],
    lastVerified: "2026-06-25",
    sourceUrl: "https://example.com",
    confidence: "high",
    ...overrides,
  };
}

describe("validateCard", () => {
  it("accepts a well-formed card", () => {
    const r = validateCard(validCard());
    expect(r.ok).toBe(true);
  });

  it("rejects a non-object payload", () => {
    expect(validateCard(null).ok).toBe(false);
    expect(validateCard("nope").ok).toBe(false);
  });

  it("rejects a bad id slug", () => {
    const r = validateCard(validCard({ id: "Bad ID!" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("rejects an unknown earn-rule category", () => {
    const r = validateCard(validCard({ earnRules: [{ category: "crypto" as never, rate: 1, unit: "percent" }] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("category"))).toBe(true);
  });

  it("accepts a general rule with valid excludedCategories", () => {
    const r = validateCard(
      validCard({
        earnRules: [
          { category: "general", rate: 0.05, unit: "percent", excludedCategories: ["ewallet", "bills"] },
        ],
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("rejects an unknown category inside excludedCategories", () => {
    const r = validateCard(
      validCard({
        earnRules: [
          { category: "general", rate: 0.05, unit: "percent", excludedCategories: ["crypto" as never] },
        ],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("excludedCategories"))).toBe(true);
  });

  it("rejects a non-array excludedCategories", () => {
    const r = validateCard(
      validCard({
        earnRules: [{ category: "general", rate: 0.05, unit: "percent", excludedCategories: "ewallet" as never }],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid unit", () => {
    const r = validateCard(validCard({ baseRule: { category: "general", rate: 1, unit: "bogus" as never } }));
    expect(r.ok).toBe(false);
  });

  it("accepts a valid wallets override", () => {
    expect(validateCard(validCard({ wallets: ["applePay", "googlePay"] })).ok).toBe(true);
  });

  it("rejects an unknown wallet key", () => {
    const r = validateCard(validCard({ wallets: ["venmo" as never] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("wallet"))).toBe(true);
  });

  it("requires a threshold for spend waivers", () => {
    const r = validateCard(validCard({ feeWaiver: { type: "spend" } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("threshold"))).toBe(true);
  });

  it("accepts a spend waiver with a threshold", () => {
    expect(validateCard(validCard({ annualFee: 195, feeWaiver: { type: "spend", threshold: 20000 } })).ok).toBe(true);
  });

  it("rejects an invalid lastVerified date", () => {
    expect(validateCard(validCard({ lastVerified: "not-a-date" })).ok).toBe(false);
  });

  it("rejects an invalid confidence level", () => {
    expect(validateCard(validCard({ confidence: "totally" as never })).ok).toBe(false);
  });

  it("rejects a negative annual fee", () => {
    expect(validateCard(validCard({ annualFee: -10 })).ok).toBe(false);
  });
});

describe("getAllCards (seed data integrity)", () => {
  it("loads the catalogue and every card passes validation", async () => {
    const cards = await getAllCards();
    expect(cards.length).toBeGreaterThan(10);
    for (const c of cards) {
      const r = validateCard(c);
      expect(r.ok, `${c.id} should be valid: ${r.ok ? "" : r.errors.join("; ")}`).toBe(true);
    }
  });

  it("has unique card ids", async () => {
    const cards = await getAllCards();
    const ids = new Set(cards.map((c) => c.id));
    expect(ids.size).toBe(cards.length);
  });
});
