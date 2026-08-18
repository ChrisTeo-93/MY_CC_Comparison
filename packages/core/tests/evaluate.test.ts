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

describe("evaluateOwned — additions vs swaps", () => {
  it("names the owned card a suggestion would take over from", () => {
    // Owns a weak card whose only job is travel; a strong travel card displaces it.
    const ev = evaluateOwned(
      { dining: 900, groceries: 1200, petrol: 700, online: 900, travel: 1500 },
      PERSONA,
      ["maybank-2-gold", "cimb-cashback", "publicbank-quantum"],
    );
    const usedToday = new Set(ev.ownedCombo.members.map((m) => m.card.id));
    expect(ev.suggestions.length).toBeGreaterThan(0);

    for (const s of ev.suggestions) {
      for (const r of s.replaces ?? []) {
        // Anything named as replaced must actually be earning today — otherwise
        // we would be telling the user to drop a card they never use.
        expect(usedToday.has(r.id), `${r.id} is named as replaced but isn't in use`).toBe(true);
      }
    }
    // The scenario exists to cover displacement, so at least one must be a swap.
    expect(ev.suggestions.some((s) => (s.replaces?.length ?? 0) > 0)).toBe(true);
  });

  it("leaves replaces unset when a card genuinely adds to the set", () => {
    // A single owned card covering one category; a card for a different category
    // supplements rather than displaces it.
    const ev = evaluateOwned({ dining: 1500, travel: 2000 }, PERSONA, ["maybank-2-gold"]);
    const pureAdds = ev.suggestions.filter((s) => !s.replaces?.length);
    expect(pureAdds.length).toBeGreaterThan(0);
  });
});
