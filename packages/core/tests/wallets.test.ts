import { describe, it, expect } from "vitest";
import type { Card } from "../src/domain/types";
import { defaultWalletsForNetwork, walletsForCard, WALLET_ORDER } from "../src/domain/wallets";

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: "test",
    name: "Test",
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

describe("defaultWalletsForNetwork", () => {
  it("gives Visa/Mastercard the three mainstream wallets, no Huawei Pay", () => {
    for (const net of ["Visa", "Mastercard"] as const) {
      const w = defaultWalletsForNetwork(net);
      expect(w).toEqual(["applePay", "googlePay", "samsungPay"]);
      expect(w).not.toContain("huaweiPay");
    }
  });

  it("gives Amex a narrower set (no Google Pay)", () => {
    expect(defaultWalletsForNetwork("Amex")).toEqual(["applePay", "samsungPay"]);
  });

  it("gives UnionPay Huawei Pay support", () => {
    expect(defaultWalletsForNetwork("UnionPay")).toContain("huaweiPay");
  });
});

describe("walletsForCard", () => {
  it("derives from the network when no override is set", () => {
    expect(walletsForCard(makeCard({ network: "Amex" }))).toEqual(["applePay", "samsungPay"]);
  });

  it("uses an explicit override when present", () => {
    const card = makeCard({ network: "Visa", wallets: ["applePay"] });
    expect(walletsForCard(card)).toEqual(["applePay"]);
  });

  it("returns wallets in canonical order regardless of how the override was authored", () => {
    const card = makeCard({ wallets: ["samsungPay", "applePay", "googlePay"] });
    const result = walletsForCard(card);
    expect(result).toEqual(WALLET_ORDER.filter((w) => result.includes(w)));
    expect(result).toEqual(["applePay", "googlePay", "samsungPay"]);
  });

  it("supports an explicit empty override (card in no wallets)", () => {
    expect(walletsForCard(makeCard({ wallets: [] }))).toEqual([]);
  });
});
