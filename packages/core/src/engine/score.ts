import type { CategoryKey } from "../domain/categories";
import { CATEGORIES, CATEGORY_BY_KEY } from "../domain/categories";
import type {
  Card,
  CardScore,
  CategoryBreakdown,
  EarnRule,
  IncomeBracket,
  Persona,
  SpendingProfile,
} from "../domain/types";
import { monthlyCapRM, rateLabel, rmValuePerRM } from "./normalize";
import { buildConditions } from "./conditions";

/** Representative qualifying income (RM/year) for each bracket. */
const BRACKET_INCOME: Record<IncomeBracket, number> = {
  under36k: 30000,
  "36to60k": 48000,
  "60to100k": 78000,
  over100k: 120000,
};

/** Resolve the effective monthly spend for a category, using persona defaults. */
export function resolveSpending(spending: SpendingProfile): Record<CategoryKey, number> {
  const out = {} as Record<CategoryKey, number>;
  for (const cat of CATEGORIES) {
    const provided = spending[cat.key];
    out[cat.key] = provided !== undefined && provided >= 0 ? provided : cat.defaultMonthly;
  }
  return out;
}

/** Pick the earn rule that applies to a category given total monthly spend. */
export function ruleForCategory(
  card: Card,
  category: CategoryKey,
  totalMonthly: number,
): EarnRule {
  const specific = card.earnRules.find((r) => r.category === category);
  if (
    specific &&
    (specific.minMonthlySpend === undefined || totalMonthly >= specific.minMonthlySpend)
  ) {
    return specific;
  }
  // A "general" bonus rule applies to every category as an uplift over base.
  const general = card.earnRules.find((r) => r.category === "general");
  if (
    general &&
    (general.minMonthlySpend === undefined || totalMonthly >= general.minMonthlySpend)
  ) {
    return general;
  }
  return card.baseRule;
}

/** Annual RM reward value a card earns on a single category's monthly spend. */
export function categoryValue(
  card: Card,
  category: CategoryKey,
  monthlySpend: number,
  totalMonthly: number,
): CategoryBreakdown {
  const rule = ruleForCategory(card, category, totalMonthly);
  const rmPerRM = rmValuePerRM(card, rule);
  const baseRmPerRM = rmValuePerRM(card, card.baseRule);
  const capRM = monthlyCapRM(card, rule);

  let monthlyReward = monthlySpend * rmPerRM;
  let capped = false;

  if (monthlyReward > capRM) {
    capped = true;
    // Spend that earned up to the cap, remainder falls back to base rate.
    const spendAtBonus = rmPerRM > 0 ? capRM / rmPerRM : 0;
    const overflowSpend = Math.max(0, monthlySpend - spendAtBonus);
    monthlyReward = capRM + overflowSpend * baseRmPerRM;
  }

  return {
    category,
    monthlySpend,
    annualValueRM: monthlyReward * 12,
    capped,
    rateLabel: rateLabel(rule),
  };
}

/** Effective annual fee after applying the card's waiver logic. */
export function effectiveAnnualFee(card: Card, annualSpend: number): number {
  if (card.annualFee === 0) return 0;
  const w = card.feeWaiver;
  switch (w.type) {
    case "always":
      return 0;
    case "none":
      return card.annualFee;
    case "spend":
      return annualSpend >= (w.threshold ?? Infinity) ? 0 : card.annualFee;
    case "swipes":
      // We do not track transaction counts; assume an active spender meets it.
      return annualSpend > 0 ? 0 : card.annualFee;
  }
}

/** Persona alignment multiplier — a transparent tie-break, kept deliberately small. */
export function personaMultiplier(card: Card, persona: Persona, effFee: number): number {
  let m = 1;
  const pref = persona.rewardPreference;
  if (pref !== "flexible") {
    if (card.rewardType === pref || card.rewardType === "hybrid") m *= 1.08;
    else m *= 0.96;
  }
  if (persona.feeTolerance === "noFee" && (card.annualFee > 0 || effFee > 0)) {
    m *= effFee > 0 ? 0.85 : 0.95; // worse if the fee actually bites
  }
  if (persona.travelFrequency === "often" && card.rewardType === "miles") m *= 1.05;
  if (persona.travelFrequency === "never" && card.rewardType === "miles") m *= 0.95;
  return m;
}

function buildReasons(
  card: Card,
  breakdown: CategoryBreakdown[],
  effFee: number,
  persona: Persona,
): string[] {
  const reasons: string[] = [];
  const top = [...breakdown].sort((a, b) => b.annualValueRM - a.annualValueRM)[0];
  if (top && top.annualValueRM > 0) {
    reasons.push(
      `Earns ~RM${Math.round(top.annualValueRM)}/yr on your ${CATEGORY_BY_KEY[top.category].label.toLowerCase()} (${top.rateLabel}).`,
    );
  }
  if (card.annualFee === 0) reasons.push("No annual fee.");
  else if (effFee === 0) reasons.push(`Annual fee (RM${card.annualFee}) waived at your spend level.`);
  if (persona.rewardPreference !== "flexible" && card.rewardType === persona.rewardPreference) {
    reasons.push(`Matches your ${persona.rewardPreference} preference.`);
  }
  if (persona.travelFrequency === "often" && card.rewardType === "miles") {
    reasons.push("Strong for frequent travellers (miles + lounge perks).");
  }
  return reasons;
}

/** Score a single card against a spending profile and persona. */
export function scoreCard(
  card: Card,
  spending: SpendingProfile,
  persona: Persona,
): CardScore {
  const resolved = resolveSpending(spending);
  const totalMonthly = Object.values(resolved).reduce((a, b) => a + b, 0);
  const annualSpend = totalMonthly * 12;

  const breakdown = CATEGORIES.map((cat) =>
    categoryValue(card, cat.key, resolved[cat.key], totalMonthly),
  ).filter((b) => b.monthlySpend > 0);

  const grossAnnualRM = breakdown.reduce((a, b) => a + b.annualValueRM, 0);
  const effFee = effectiveAnnualFee(card, annualSpend);
  const netAnnualRM = grossAnnualRM - effFee;
  const adjustedNetRM = netAnnualRM * personaMultiplier(card, persona, effFee);
  const eligible = BRACKET_INCOME[persona.incomeBracket] >= card.minAnnualIncome;

  return {
    card,
    grossAnnualRM,
    effectiveAnnualFee: effFee,
    netAnnualRM,
    adjustedNetRM,
    breakdown,
    eligible,
    reasons: buildReasons(card, breakdown, effFee, persona),
    conditions: buildConditions(card, resolved, totalMonthly),
  };
}
