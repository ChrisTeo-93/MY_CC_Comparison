import type { CategoryKey } from "../domain/categories";
import { CATEGORY_BY_KEY } from "../domain/categories";
import type { Card, RecommendationResult, SpendingProfile } from "../domain/types";
import { monthlyCapRM, rateLabel, rmValuePerRM } from "./normalize";
import { effectiveAnnualFee, resolveSpending, ruleForCategory } from "./score";

export interface MaxTip {
  kind: "overflow" | "waiver";
  title: string;
  detail: string;
  /** Estimated extra RM/year this move captures. */
  annualGainRM: number;
}

const MIN_ANNUAL_GAIN = 12; // ignore tips worth less than ~RM1/month

interface CardRateForCat {
  card: Card;
  /** RM reward per RM spent in this category. */
  rate: number;
  /** Category spend (RM/mo) at which this card's bonus cap is reached. */
  capSpend: number;
  /** This card's base RM-per-RM rate (what overflow falls back to). */
  base: number;
}

/**
 * Build actionable "how to use these cards together" tips. The headline move:
 * when your spend in a category exceeds the assigned card's monthly cap, the
 * overflow silently drops to that card's base rate — so route it to another card
 * in the set instead. This is value the per-category combo assignment alone
 * doesn't capture, since that assignment moves whole categories at a time.
 *
 * Scoped strictly to the cards in the recommended combo. The panel's job is to
 * explain how to work the portfolio we just recommended, so naming a card that
 * isn't in it reads as a contradiction — and worse, advice built around a card
 * the user was never told to get is advice they cannot act on.
 */
export function buildTips(result: RecommendationResult, spending: SpendingProfile): MaxTip[] {
  const members = result.combo.members;
  if (members.length === 0) return [];

  const resolved = resolveSpending(spending);
  const tips: MaxTip[] = [];

  // Monthly spend the combo actually routes to each card. Rates and waivers are
  // judged against this, not the user's whole profile, matching how the combo
  // optimiser scores — otherwise a tip could promise a bonus rate or a fee
  // waiver the card can't reach on the spend it actually receives.
  const routedMonthly = new Map<string, number>();
  const ownerOf = new Map<CategoryKey, Card>();
  for (const m of members) {
    routedMonthly.set(
      m.card.id,
      m.assignedCategories.reduce((a, c) => a + resolved[c], 0),
    );
    for (const c of m.assignedCategories) ownerOf.set(c, m.card);
  }
  const monthlyFor = (card: Card) => routedMonthly.get(card.id) ?? 0;

  const rateFor = (card: Card, cat: CategoryKey): CardRateForCat => {
    const rule = ruleForCategory(card, cat, monthlyFor(card));
    const rate = rmValuePerRM(card, rule);
    const capRM = monthlyCapRM(card, rule);
    return {
      card,
      rate,
      capSpend: Number.isFinite(capRM) && rate > 0 ? capRM / rate : Infinity,
      base: rmValuePerRM(card, card.baseRule),
    };
  };

  // --- Overflow routing -----------------------------------------------------
  for (const cat of Object.keys(resolved) as CategoryKey[]) {
    const spend = resolved[cat];
    if (spend <= 0) continue;

    // The card the combo actually put this category on — so the tip explains
    // the recommendation the user is looking at, rather than second-guessing it.
    const owner = ownerOf.get(cat);
    if (!owner) continue;

    const current = rateFor(owner, cat);
    if (current.rate <= 0 || spend <= current.capSpend) continue; // no cap overflow

    const overflow = spend - current.capSpend;
    // Best home for the overflow: another combo card whose rate beats the
    // owner's base fallback.
    const alt = members
      .map((m) => m.card)
      .filter((c) => c.id !== owner.id)
      .map((c) => rateFor(c, cat))
      .sort((a, b) => b.rate - a.rate)
      .find((r) => r.rate > current.base);
    if (!alt) continue;

    const routed = Math.min(overflow, alt.capSpend);
    const annualGainRM = routed * (alt.rate - current.base) * 12;
    if (annualGainRM < MIN_ANNUAL_GAIN) continue;

    const label = CATEGORY_BY_KEY[cat].label.toLowerCase();
    tips.push({
      kind: "overflow",
      title: `Split your ${label} across two cards`,
      detail:
        `You spend about RM${Math.round(spend)}/mo on ${label}. ${owner.name} ` +
        `(${rateLabel(ruleForCategory(owner, cat, monthlyFor(owner)))}) maxes out around ` +
        `RM${Math.round(current.capSpend)}/mo here — beyond that it drops to its base rate. ` +
        `Put the extra ~RM${Math.round(routed)}/mo on ${alt.card.name} ` +
        `(${rateLabel(ruleForCategory(alt.card, cat, monthlyFor(alt.card)))}) instead.`,
      annualGainRM,
    });
  }

  // --- Fee-waiver near-misses ----------------------------------------------
  for (const m of members) {
    const card = m.card;
    if (card.feeWaiver.type !== "spend" || card.annualFee <= 0) continue;
    const threshold = card.feeWaiver.threshold ?? 0;
    const cardAnnualSpend = monthlyFor(card) * 12;
    if (effectiveAnnualFee(card, cardAnnualSpend) === 0) continue; // already waived
    const shortfall = threshold - cardAnnualSpend;
    if (shortfall <= 0 || shortfall > threshold * 0.25) continue; // only flag near-misses
    tips.push({
      kind: "waiver",
      title: `Waive ${card.name}'s annual fee`,
      detail:
        `You're about RM${Math.round(shortfall)}/year short of the RM${threshold.toLocaleString("en-MY")} spend ` +
        `that waives ${card.name}'s RM${card.annualFee} fee. Routing more of your existing spend to this card ` +
        `crosses the line — no extra spending needed.`,
      annualGainRM: card.annualFee,
    });
  }

  return tips.sort((a, b) => b.annualGainRM - a.annualGainRM).slice(0, 4);
}
