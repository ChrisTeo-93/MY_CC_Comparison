import type { CategoryKey } from "../domain/categories";
import { CATEGORIES } from "../domain/categories";
import type {
  Card,
  CardScore,
  ComboMember,
  ComboRecommendation,
  Persona,
  SpendingProfile,
} from "../domain/types";
import { scoreCard } from "./score";

const MAX_COMBO = 3;

/**
 * Greedy portfolio optimiser.
 *
 * Approximation: each card's per-category value is computed as if the user's
 * FULL spending profile sat on that card (so caps / min-spend unlocks are
 * evaluated against total spend). In reality, splitting spend across cards can
 * lower per-card totals; this keeps the optimisation tractable and the result
 * directionally correct for a small card set. Documented as a known limitation.
 */
export function bestCombo(
  scores: CardScore[],
  _spending: SpendingProfile,
  _persona: Persona,
): ComboRecommendation {
  const eligible = scores.filter((s) => s.eligible);
  if (eligible.length === 0) {
    return { members: [], netAnnualRM: 0, totalAnnualFee: 0 };
  }

  // cardId -> (category -> annual value); cardId -> effective fee.
  const catVal = new Map<string, Map<CategoryKey, number>>();
  const feeOf = new Map<string, number>();
  for (const s of eligible) {
    const m = new Map<CategoryKey, number>();
    for (const b of s.breakdown) m.set(b.category, b.annualValueRM);
    catVal.set(s.card.id, m);
    feeOf.set(s.card.id, s.effectiveAnnualFee);
  }

  const valueFor = (cardId: string, cat: CategoryKey) =>
    catVal.get(cardId)?.get(cat) ?? 0;

  // Seed with the strongest single card (by persona-adjusted net value).
  const seed = [...eligible].sort((a, b) => b.adjustedNetRM - a.adjustedNetRM)[0];
  const combo: Card[] = [seed.card];

  const bestInCombo = (cat: CategoryKey) =>
    Math.max(0, ...combo.map((c) => valueFor(c.id, cat)));

  while (combo.length < MAX_COMBO) {
    let bestCandidate: Card | null = null;
    let bestMarginalNet = 0;

    for (const s of eligible) {
      if (combo.some((c) => c.id === s.card.id)) continue;
      let marginalGross = 0;
      for (const cat of CATEGORIES) {
        const gain = valueFor(s.card.id, cat.key) - bestInCombo(cat.key);
        if (gain > 0) marginalGross += gain;
      }
      const marginalNet = marginalGross - (feeOf.get(s.card.id) ?? 0);
      if (marginalNet > bestMarginalNet) {
        bestMarginalNet = marginalNet;
        bestCandidate = s.card;
      }
    }

    // Only add a card if it pays for itself (covers its own fee).
    if (bestCandidate && bestMarginalNet > 0) combo.push(bestCandidate);
    else break;
  }

  // Assign every category to the combo card that earns the most on it.
  const assigned = new Map<string, CategoryKey[]>();
  const contribution = new Map<string, number>();
  for (const c of combo) {
    assigned.set(c.id, []);
    contribution.set(c.id, 0);
  }

  for (const cat of CATEGORIES) {
    let bestCard: Card | null = null;
    let bestVal = 0;
    for (const c of combo) {
      const v = valueFor(c.id, cat.key);
      if (v > bestVal) {
        bestVal = v;
        bestCard = c;
      }
    }
    if (bestCard && bestVal > 0) {
      assigned.get(bestCard.id)!.push(cat.key);
      contribution.set(bestCard.id, contribution.get(bestCard.id)! + bestVal);
    }
  }

  // Keep only cards that actually earn something in the combo.
  const members: ComboMember[] = combo
    .filter((c) => (assigned.get(c.id)?.length ?? 0) > 0)
    .map((c) => ({
      card: c,
      assignedCategories: assigned.get(c.id)!,
      contributionRM: contribution.get(c.id)!,
    }));

  const totalAnnualFee = members.reduce((a, m) => a + (feeOf.get(m.card.id) ?? 0), 0);
  const grossRM = members.reduce((a, m) => a + m.contributionRM, 0);

  return {
    members,
    netAnnualRM: grossRM - totalAnnualFee,
    totalAnnualFee,
  };
}

/** Convenience wrapper that scores then builds the combo. */
export function comboFromCards(
  cards: Card[],
  spending: SpendingProfile,
  persona: Persona,
): ComboRecommendation {
  const scores = cards.map((c) => scoreCard(c, spending, persona));
  return bestCombo(scores, spending, persona);
}
