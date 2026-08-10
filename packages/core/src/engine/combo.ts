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
import { govtServiceTax } from "./normalize";
import { categoryValue, effectiveAnnualFee, resolveSpending, scoreCard } from "./score";

const MAX_COMBO = 3;
/** RM tolerance so floating-point noise never registers as an improvement. */
const EPSILON = 0.01;
/** Safety bound on hill-climbing passes; convergence is typically 2–3. */
const MAX_PASSES = 12;

const CATEGORY_ORDER: CategoryKey[] = CATEGORIES.map((c) => c.key);

/** Gross annual value plus the holding costs a card incurs on a routed spend set. */
interface RoutedScore {
  gross: number;
  fee: number;
  tax: number;
}

interface Evaluated {
  netAnnualRM: number;
  members: ComboMember[];
  totalAnnualFee: number;
  totalGovtTaxRM: number;
}

type ScoreRouted = (card: Card, cats: CategoryKey[]) => RoutedScore;

/**
 * Scores a card against ONLY the spend routed to it — the correction that makes
 * combos honest.
 *
 * Min-spend unlocks, monthly caps and spend-based fee waivers are all evaluated
 * against this card's own routed total, not the user's whole spending profile.
 * Scoring a card as if every ringgit sat on it (the previous approach) credits
 * bonus rates the user could never actually trigger once spend is split across
 * the combo.
 *
 * Deliberately lighter than `scoreCard`: no conditions or reason strings, since
 * the search evaluates many thousands of candidate assignments.
 */
function makeScorer(resolved: Record<CategoryKey, number>): ScoreRouted {
  const memo = new Map<string, RoutedScore>();
  return (card, cats) => {
    const key = `${card.id}|${cats.join(",")}`;
    const hit = memo.get(key);
    if (hit) return hit;

    let totalMonthly = 0;
    for (const c of cats) totalMonthly += resolved[c];

    let gross = 0;
    for (const c of cats) {
      gross += categoryValue(card, c, resolved[c], totalMonthly).annualValueRM;
    }

    const out: RoutedScore = {
      gross,
      fee: effectiveAnnualFee(card, totalMonthly * 12),
      tax: govtServiceTax(card),
    };
    memo.set(key, out);
    return out;
  };
}

/** Exact value of one category→card assignment. */
function evaluateAssignment(
  cards: Card[],
  assignment: Map<CategoryKey, string>,
  scoreRouted: ScoreRouted,
): Evaluated {
  const members: ComboMember[] = [];
  let totalAnnualFee = 0;
  let totalGovtTaxRM = 0;
  let gross = 0;

  for (const card of cards) {
    const cats = CATEGORY_ORDER.filter((k) => assignment.get(k) === card.id);
    // Nothing routed here means the card simply isn't held — no fee, no govt tax.
    if (cats.length === 0) continue;

    const s = scoreRouted(card, cats);
    gross += s.gross;
    totalAnnualFee += s.fee;
    totalGovtTaxRM += s.tax;
    members.push({ card, assignedCategories: cats, contributionRM: s.gross });
  }

  return {
    netAnnualRM: gross - totalAnnualFee - totalGovtTaxRM,
    members,
    totalAnnualFee,
    totalGovtTaxRM,
  };
}

/** Local search: move one category at a time, keeping only genuine improvements. */
function climb(
  cards: Card[],
  seed: Map<CategoryKey, string>,
  scoreRouted: ScoreRouted,
): Evaluated {
  const assignment = new Map(seed);
  let current = evaluateAssignment(cards, assignment, scoreRouted);
  if (cards.length < 2) return current;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let improved = false;

    for (const key of CATEGORY_ORDER) {
      const owner = assignment.get(key);
      if (owner === undefined) continue; // no spend in this category

      for (const card of cards) {
        if (card.id === owner) continue;
        assignment.set(key, card.id);
        const trial = evaluateAssignment(cards, assignment, scoreRouted);
        if (trial.netAnnualRM > current.netAnnualRM + EPSILON) {
          current = trial;
          improved = true;
          break; // keep the move, on to the next category
        }
        assignment.set(key, owner); // revert
      }
    }

    if (!improved) break;
  }

  return current;
}

/**
 * Best category routing for a fixed set of cards.
 *
 * Runs the climb from two starting points, because single-category moves alone
 * get stuck: a card that needs two or three categories together to cover its
 * annual fee is rejected when each category is offered to it in isolation.
 */
function bestAssignment(
  cards: Card[],
  resolved: Record<CategoryKey, number>,
  scoreRouted: ScoreRouted,
  fullSpendValue: Map<string, Map<CategoryKey, number>>,
): Evaluated {
  const spendCats = CATEGORY_ORDER.filter((k) => resolved[k] > 0);

  // Start 1 — everything on the lead card, so each split must justify itself.
  const allOnLead = new Map<CategoryKey, string>();
  for (const k of spendCats) allOnLead.set(k, cards[0].id);
  const fromLead = climb(cards, allOnLead, scoreRouted);
  if (cards.length < 2) return fromLead;

  // Start 2 — optimistic: every category to whoever earns most on it under full
  // spend. This groups a card's strong categories together up front.
  const optimistic = new Map<CategoryKey, string>();
  for (const k of spendCats) {
    let pick = cards[0];
    let bestVal = -Infinity;
    for (const card of cards) {
      const v = fullSpendValue.get(card.id)?.get(k) ?? 0;
      if (v > bestVal) {
        bestVal = v;
        pick = card;
      }
    }
    optimistic.set(k, pick.id);
  }
  const fromOptimistic = climb(cards, optimistic, scoreRouted);

  return fromOptimistic.netAnnualRM > fromLead.netAnnualRM ? fromOptimistic : fromLead;
}

/**
 * Greedy portfolio builder.
 *
 * Seeds with the strongest single card, then adds a card only when doing so
 * lifts the WHOLE portfolio's net value — which implicitly requires it to cover
 * its own annual fee and govt service tax out of the spend actually routed to
 * it. Each candidate set is re-routed from scratch, so adding a card can also
 * re-shuffle which categories the incumbents keep.
 */
export function bestCombo(
  scores: CardScore[],
  spending: SpendingProfile,
  _persona: Persona,
): ComboRecommendation {
  const eligible = scores.filter((s) => s.eligible);
  if (eligible.length === 0) {
    return { members: [], netAnnualRM: 0, totalAnnualFee: 0, totalGovtTaxRM: 0 };
  }

  const resolved = resolveSpending(spending);
  const scoreRouted = makeScorer(resolved);

  // Per-category value under the user's FULL spend. Used only to warm-start the
  // assignment search — never to credit value, since it is exactly the
  // optimistic figure this module exists to correct.
  const fullSpendValue = new Map<string, Map<CategoryKey, number>>();
  for (const s of eligible) {
    const m = new Map<CategoryKey, number>();
    for (const b of s.breakdown) m.set(b.category, b.annualValueRM);
    fullSpendValue.set(s.card.id, m);
  }

  const lead = [...eligible].sort((a, b) => b.adjustedNetRM - a.adjustedNetRM)[0];
  const combo: Card[] = [lead.card];
  let best = bestAssignment(combo, resolved, scoreRouted, fullSpendValue);

  while (combo.length < MAX_COMBO) {
    let candidate: Card | null = null;
    let candidateResult: Evaluated | null = null;

    for (const s of eligible) {
      if (combo.some((c) => c.id === s.card.id)) continue;
      const trial = bestAssignment([...combo, s.card], resolved, scoreRouted, fullSpendValue);
      const bar = candidateResult?.netAnnualRM ?? best.netAnnualRM;
      if (trial.netAnnualRM > bar + EPSILON) {
        candidate = s.card;
        candidateResult = trial;
      }
    }

    if (!candidate || !candidateResult) break;
    combo.push(candidate);
    best = candidateResult;
  }

  return {
    members: best.members,
    netAnnualRM: best.netAnnualRM,
    totalAnnualFee: best.totalAnnualFee,
    totalGovtTaxRM: best.totalGovtTaxRM,
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
