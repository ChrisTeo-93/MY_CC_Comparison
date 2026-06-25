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

/** Distinct cards from the recommended combo, then the top single cards. */
function tipPool(result: RecommendationResult): Card[] {
  const ordered = [
    ...result.combo.members.map((m) => m.card),
    ...result.single.slice(0, 3).map((s) => s.card),
  ];
  const seen = new Set<string>();
  const pool: Card[] = [];
  for (const c of ordered) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      pool.push(c);
    }
    if (pool.length >= 5) break;
  }
  return pool;
}

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
 * when your spend in a category exceeds the best card's monthly cap, the overflow
 * silently drops to that card's base rate — so route it to a second card instead.
 * This is value the per-category combo assignment alone doesn't capture.
 */
export function buildTips(result: RecommendationResult, spending: SpendingProfile): MaxTip[] {
  const pool = tipPool(result);
  if (pool.length === 0) return [];

  const resolved = resolveSpending(spending);
  const totalMonthly = Object.values(resolved).reduce((a, b) => a + b, 0);
  const tips: MaxTip[] = [];

  // --- Overflow routing -----------------------------------------------------
  for (const cat of Object.keys(resolved) as CategoryKey[]) {
    const spend = resolved[cat];
    if (spend <= 0) continue;

    const ranked: CardRateForCat[] = pool
      .map((card) => {
        const rule = ruleForCategory(card, cat, totalMonthly);
        const rate = rmValuePerRM(card, rule);
        const capRM = monthlyCapRM(card, rule);
        const capSpend = Number.isFinite(capRM) && rate > 0 ? capRM / rate : Infinity;
        return { card, rate, capSpend, base: rmValuePerRM(card, card.baseRule) };
      })
      .sort((a, b) => b.rate - a.rate);

    const best = ranked[0];
    if (best.rate <= 0 || spend <= best.capSpend) continue; // no cap overflow

    const overflow = spend - best.capSpend;
    // Best home for the overflow: another card whose rate beats best's base fallback.
    const alt = ranked.slice(1).find((r) => r.card.id !== best.card.id && r.rate > best.base);
    if (!alt) continue;

    const routed = Math.min(overflow, alt.capSpend);
    const gainPerMonth = routed * (alt.rate - best.base);
    const annualGainRM = gainPerMonth * 12;
    if (annualGainRM < MIN_ANNUAL_GAIN) continue;

    const label = CATEGORY_BY_KEY[cat].label.toLowerCase();
    const bestRule = ruleForCategory(best.card, cat, totalMonthly);
    const altRule = ruleForCategory(alt.card, cat, totalMonthly);
    tips.push({
      kind: "overflow",
      title: `Split your ${label} across two cards`,
      detail:
        `You spend about RM${Math.round(spend)}/mo on ${label}. ${best.card.name} (${rateLabel(bestRule)}) ` +
        `maxes out around RM${Math.round(best.capSpend)}/mo here — beyond that it drops to its base rate. ` +
        `Put the extra ~RM${Math.round(routed)}/mo on ${alt.card.name} (${rateLabel(altRule)}) instead.`,
      annualGainRM,
    });
  }

  // --- Fee-waiver near-misses ----------------------------------------------
  const annualSpend = totalMonthly * 12;
  for (const card of pool) {
    if (card.feeWaiver.type !== "spend" || card.annualFee <= 0) continue;
    const threshold = card.feeWaiver.threshold ?? 0;
    if (effectiveAnnualFee(card, annualSpend) === 0) continue; // already waived
    const shortfall = threshold - annualSpend;
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
