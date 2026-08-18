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
import { govtServiceTax, monthlyCapRM, rateLabel, rmValuePerRM } from "./normalize";
import { buildConditions } from "./conditions";

/** Representative qualifying income (RM/year) for each bracket. */
export const BRACKET_INCOME: Record<IncomeBracket, number> = {
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
  // A "general" bonus rule applies to every category as an uplift over base —
  // except any category the bank explicitly carves out (e-wallet reloads,
  // bills/govt payments are common real-world exclusions from "earn on
  // everything" promotions), which falls back to the base rate instead.
  const general = card.earnRules.find((r) => r.category === "general");
  if (
    general &&
    !(general.excludedCategories ?? []).includes(category) &&
    (general.minMonthlySpend === undefined || totalMonthly >= general.minMonthlySpend)
  ) {
    return general;
  }
  return card.baseRule;
}

/**
 * Annual RM reward value a card earns on ONE category's monthly spend, treating
 * that category as if it were the only one with spend. Use `cardBreakdown` for a
 * whole card — this cannot see caps pooled across sibling categories.
 */
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

  // A restricted bonus (weekend-only being the common Malaysian case) reaches
  // only part of the category's spend; the rest earns the base rate. Unset means
  // the rate applies to everything, so this is a no-op for unrestricted rules.
  const share = Math.min(1, Math.max(0, rule.eligibleShare ?? 1));
  const eligibleSpend = monthlySpend * share;
  const restrictedOutSpend = monthlySpend - eligibleSpend;

  // The cap applies to the bonus, so it is measured against eligible spend only.
  let monthlyReward = eligibleSpend * rmPerRM;
  let capped = false;

  if (monthlyReward > capRM) {
    capped = true;
    // Spend that earned up to the cap, remainder falls back to base rate.
    const spendAtBonus = rmPerRM > 0 ? capRM / rmPerRM : 0;
    const overflowSpend = Math.max(0, eligibleSpend - spendAtBonus);
    monthlyReward = capRM + overflowSpend * baseRmPerRM;
  }

  monthlyReward += restrictedOutSpend * baseRmPerRM;

  return {
    category,
    monthlySpend,
    annualValueRM: monthlyReward * 12,
    capped,
    rateLabel: rateLabel(rule),
  };
}

/**
 * Per-category breakdown for a WHOLE card, with monthly caps pooled correctly.
 *
 * A cap belongs to a rule, not to a category. Computing each category on its own
 * (via `categoryValue`) hands a fresh allowance to every category a rule serves,
 * which silently multiplies the ceiling: a `general` omni-rule capped at RM50/mo
 * would pay RM50 on dining AND RM50 on groceries AND so on, when RM50 is the
 * card's whole monthly bonus. `capGroup` extends the same pooling across
 * different rules, for banks that cap a group of categories jointly.
 *
 * Within a pool the allowance goes to the highest-earning categories first — the
 * best case for the user, consistent with the optimistic routing modelled
 * elsewhere in the engine.
 */
export function cardBreakdown(
  card: Card,
  resolved: Record<CategoryKey, number>,
  totalMonthly: number,
): CategoryBreakdown[] {
  const baseRmPerRM = rmValuePerRM(card, card.baseRule);

  interface Item {
    category: CategoryKey;
    rule: EarnRule;
    rate: number;
    capRM: number;
    /** Spend the rate can reach, after any eligibleShare restriction. */
    eligible: number;
    /** Spend the restriction excludes — always earns the base rate. */
    rest: number;
    order: number;
  }

  const items: Item[] = [];
  CATEGORIES.forEach((cat, order) => {
    const spend = resolved[cat.key] ?? 0;
    if (spend <= 0) return;
    const rule = ruleForCategory(card, cat.key, totalMonthly);
    const share = Math.min(1, Math.max(0, rule.eligibleShare ?? 1));
    const eligible = spend * share;
    items.push({
      category: cat.key,
      rule,
      rate: rmValuePerRM(card, rule),
      capRM: monthlyCapRM(card, rule),
      eligible,
      rest: spend - eligible,
      order,
    });
  });

  // One pool per capGroup, else per rule identity (the rule object itself).
  const pools = new Map<string | EarnRule, Item[]>();
  for (const it of items) {
    const key = it.rule.capGroup ?? it.rule;
    const list = pools.get(key);
    if (list) list.push(it);
    else pools.set(key, [it]);
  }

  const out: (CategoryBreakdown & { order: number })[] = [];
  for (const members of pools.values()) {
    // Rules in a group should share one cap; if they disagree, the smallest wins.
    const capRM = Math.min(...members.map((m) => m.capRM));
    let remaining = capRM;

    for (const m of [...members].sort((a, b) => b.rate - a.rate)) {
      const wanted = m.eligible * m.rate;
      let reward: number;
      let capped = false;
      if (wanted <= remaining + 1e-9) {
        reward = wanted;
        remaining -= wanted;
      } else {
        capped = true;
        const spendAtBonus = m.rate > 0 ? remaining / m.rate : 0;
        reward = remaining + Math.max(0, m.eligible - spendAtBonus) * baseRmPerRM;
        remaining = 0;
      }
      out.push({
        category: m.category,
        monthlySpend: m.eligible + m.rest,
        annualValueRM: (reward + m.rest * baseRmPerRM) * 12,
        capped,
        rateLabel: rateLabel(m.rule),
        order: m.order,
      });
    }
  }

  // Restore the canonical category order the UI expects.
  return out.sort((a, b) => a.order - b.order).map(({ order: _order, ...b }) => b);
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

  const breakdown = cardBreakdown(card, resolved, totalMonthly);

  const grossAnnualRM = breakdown.reduce((a, b) => a + b.annualValueRM, 0);
  const effFee = effectiveAnnualFee(card, annualSpend);
  const govtTax = govtServiceTax(card);
  const netAnnualRM = grossAnnualRM - effFee - govtTax;
  // The persona fee-tolerance tie-break is about the BANK's own fee-charging
  // behaviour, not the uniform unwaivable govt tax every card carries — so it
  // intentionally still takes the bank-only effFee, not netAnnualRM.
  const adjustedNetRM = netAnnualRM * personaMultiplier(card, persona, effFee);
  const eligible = BRACKET_INCOME[persona.incomeBracket] >= card.minAnnualIncome;

  return {
    card,
    grossAnnualRM,
    effectiveAnnualFee: effFee,
    govtTaxRM: govtTax,
    netAnnualRM,
    adjustedNetRM,
    breakdown,
    eligible,
    reasons: buildReasons(card, breakdown, effFee, persona),
    conditions: buildConditions(card, resolved, totalMonthly),
  };
}
