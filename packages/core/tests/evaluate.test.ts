import { describe, it, expect } from "vitest";
import { ACTIVE_CARDS } from "../src/domain/cards";
import type { Persona } from "../src/domain/types";
import { evaluateOwned } from "../src/engine/evaluate";

const PERSONA: Persona = {
  rewardPreference: "flexible",
  incomeBracket: "over100k",
  feeTolerance: "ifWorthIt",
  travelFrequency: "sometimes",
  effortTolerance: "multi",
};

const SPENDING = { dining: 600, groceries: 800, petrol: 400, online: 500 };

describe("evaluateOwned", () => {
  it("scores exactly the owned cards and sums to the combo net", () => {
    const e = evaluateOwned(SPENDING, PERSONA, ["maybank-2-gold", "cimb-cashback"]);
    expect(e.ownedScores.map((s) => s.card.id).sort()).toEqual(["cimb-cashback", "maybank-2-gold"]);
    expect(e.currentNetAnnualRM).toBeCloseTo(e.ownedCombo.netAnnualRM);
  });

  it("never suggests a card the user already owns, and only worthwhile additions", () => {
    const e = evaluateOwned(SPENDING, PERSONA, ["rhb-cashback"]);
    const ownedIds = new Set(["rhb-cashback"]);
    for (const s of e.suggestions) {
      expect(ownedIds.has(s.card.id)).toBe(false);
      expect(s.addedAnnualRM).toBeGreaterThanOrEqual(12);
    }
  });

  it("evaluates owned cards regardless of income eligibility", () => {
    // Maybank Visa Infinite needs RM120k income; a low-income user still holds it.
    const e = evaluateOwned(SPENDING, { ...PERSONA, incomeBracket: "under36k" }, ["maybank-visa-infinite"]);
    expect(e.ownedScores[0].card.id).toBe("maybank-visa-infinite");
    expect(e.ownedScores[0].eligible).toBe(true);
  });

  it("has no upside or suggestions when you already own every card", () => {
    const allIds = ACTIVE_CARDS.map((c) => c.id);
    const e = evaluateOwned(SPENDING, PERSONA, allIds);
    expect(e.suggestions).toHaveLength(0);
    expect(e.alreadyOptimal).toBe(true);
  });

  it("reports a positive upside when holding a single modest card", () => {
    const e = evaluateOwned(SPENDING, PERSONA, ["rhb-cashback"]);
    expect(e.bestNetAnnualRM).toBeGreaterThanOrEqual(e.currentNetAnnualRM);
    expect(e.upsideAnnualRM).toBeGreaterThanOrEqual(0);
  });
});
