import type { CategoryKey } from "../domain/categories";
import type {
  Card,
  CardScore,
  IncomeBracket,
  Persona,
  RecommendationResult,
  SpendingProfile,
} from "../domain/types";
import { INCOME_QUESTION } from "../persona/questions";
import { recommend } from "./recommend";
import { monthlyCapRM, rmValuePerRM } from "./normalize";
import { resolveSpending } from "./score";

/** Why a card that the user could have got is not in the recommendation. */
export interface CardOmission {
  card: Card;
  /** Short, specific reason — never just "it scored lower". */
  reason: string;
  /** What it would earn on its own, for context against the winners. */
  netAnnualRM: number;
}

/**
 * Explain the near misses.
 *
 * A comparison tool that only ever surfaces the same handful of cards invites
 * the suspicion that it isn't really comparing. Naming the runners-up and what
 * specifically cost them is the evidence that it is — and each reason doubles as
 * something the user can act on ("it needs RM3,000/month on it to be worth
 * having" tells you whether you're the person it suits).
 *
 * Ordered by what the card would have been worth, so the strongest near misses —
 * the ones a user is most likely to be wondering about — come first.
 */
export function explainOmissions(
  result: RecommendationResult,
  spending: SpendingProfile,
  limit = 5,
): CardOmission[] {
  const inCombo = new Set(result.combo.members.map((m) => m.card.id));
  const resolved = resolveSpending(spending);
  const totalMonthly = Object.values(resolved).reduce((a, b) => a + b, 0);

  const best = result.combo.members.length
    ? result.combo.netAnnualRM
    : (result.single[0]?.netAnnualRM ?? 0);

  return result.single
    .filter((s) => !inCombo.has(s.card.id))
    .slice(0, limit)
    .map((s) => ({ card: s.card, reason: reasonFor(s, resolved, totalMonthly, best), netAnnualRM: s.netAnnualRM }));
}

function reasonFor(
  score: CardScore,
  resolved: Record<CategoryKey, number>,
  totalMonthly: number,
  bestNetAnnualRM: number,
): string {
  const { card } = score;

  // 1. The fee is the whole story: it earns, but not enough to cover itself.
  if (score.effectiveAnnualFee > 0 && score.grossAnnualRM < score.effectiveAnnualFee + score.govtTaxRM) {
    return `Its RM${card.annualFee} annual fee costs more than the RM${Math.round(score.grossAnnualRM)}/yr it would earn on your spending.`;
  }

  // 2. A bonus locked behind spend the user doesn't do.
  const gated = card.earnRules
    .filter((r) => r.minMonthlySpend !== undefined && totalMonthly < r.minMonthlySpend)
    .sort((a, b) => (a.minMonthlySpend ?? 0) - (b.minMonthlySpend ?? 0))[0];
  if (gated) {
    return `Its best rate needs RM${gated.minMonthlySpend!.toLocaleString("en-MY")}/month on this card — you're at about RM${Math.round(totalMonthly).toLocaleString("en-MY")}.`;
  }

  // 3. A bonus that runs out early against how much the user spends there.
  const tight = card.earnRules
    .map((r) => {
      const rate = rmValuePerRM(card, r);
      const capRM = monthlyCapRM(card, r);
      if (!Number.isFinite(capRM) || rate <= 0) return null;
      const spendToCap = capRM / rate;
      const yourSpend = r.category === "general" ? totalMonthly : (resolved[r.category] ?? 0);
      return yourSpend > spendToCap * 1.5 ? { capRM, spendToCap } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a!.capRM - b!.capRM)[0];
  if (tight) {
    return `Its bonus stops at RM${Math.round(tight.capRM)}/month, which your spending passes well before the month is out.`;
  }

  // 4. Nothing specific went wrong — it is simply beaten.
  const gap = Math.round(bestNetAnnualRM - score.netAnnualRM);
  return gap > 0
    ? `Earns about RM${gap.toLocaleString("en-MY")}/yr less than the recommendation above on your spending.`
    : "Close, but the recommended set edges it out on your spending.";
}

/** What moving up an income bracket would open up. */
export interface IncomeUpside {
  nextBracket: IncomeBracket;
  /** Label for that bracket, matching the persona quiz wording. */
  nextBracketLabel: string;
  /** How many more cards become available. */
  unlocks: number;
  /** Extra net RM/year the best setup would earn there (0 if none). */
  extraAnnualRM: number;
}

const BRACKET_ORDER: IncomeBracket[] = ["under36k", "36to60k", "60to100k", "over100k"];

/**
 * Turn "18 cards hidden" into something the user can aim at.
 *
 * Income is the one filter a user can actually change over time, and low earners
 * — a large share of the Malaysian market — currently see mostly a list of what
 * they can't have. Showing the next rung and what it's worth reframes the wall
 * as a goal. Returns null at the top bracket or when nothing would change.
 */
export function incomeUpside(
  spending: SpendingProfile,
  persona: Persona,
  catalogue?: Card[],
): IncomeUpside | null {
  const i = BRACKET_ORDER.indexOf(persona.incomeBracket);
  if (i < 0 || i === BRACKET_ORDER.length - 1) return null;
  const nextBracket = BRACKET_ORDER[i + 1];

  const now = recommend(spending, persona, catalogue);
  const next = recommend(spending, { ...persona, incomeBracket: nextBracket }, catalogue);

  const unlocks = next.single.length - now.single.length;
  if (unlocks <= 0) return null;

  const label = INCOME_QUESTION.options.find((o) => o.value === nextBracket)?.label ?? nextBracket;
  return {
    nextBracket,
    nextBracketLabel: label,
    unlocks,
    extraAnnualRM: Math.max(0, next.combo.netAnnualRM - now.combo.netAnnualRM),
  };
}
