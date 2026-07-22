import { ACTIVE_CARDS, CARD_BY_ID } from "../domain/cards";
import type {
  Card,
  CardScore,
  ComboRecommendation,
  Persona,
  SpendingProfile,
} from "../domain/types";
import { bestCombo } from "./combo";
import { recommend } from "./recommend";
import { scoreCard } from "./score";
import { buildTips, type MaxTip } from "./tips";

export interface AddSuggestion {
  card: Card;
  /** Extra net RM/year from adding this card to what the user already holds. */
  addedAnnualRM: number;
}

export interface Evaluation {
  /** The user's owned cards, scored and sorted by net annual value. */
  ownedScores: CardScore[];
  /** Best way to use the owned cards together. */
  ownedCombo: ComboRecommendation;
  /** Net RM/year the user earns using their cards optimally. */
  currentNetAnnualRM: number;
  /** Net RM/year the best possible setup (full catalogue) would earn. */
  bestNetAnnualRM: number;
  /** bestNetAnnualRM − currentNetAnnualRM (never negative). */
  upsideAnnualRM: number;
  /** Eligible cards the user doesn't own yet, ranked by what they'd add. */
  suggestions: AddSuggestion[];
  /** "Use them better" tips for the owned set (cap overflow, fee waivers). */
  tips: MaxTip[];
  /** True when the owned setup is essentially as good as the best available. */
  alreadyOptimal: boolean;
}

const NEGLIGIBLE = 12; // RM/year below which an upside isn't worth mentioning

/** Owned cards are already held, so income eligibility shouldn't exclude them. */
function scoreOwned(card: Card, spending: SpendingProfile, persona: Persona): CardScore {
  return { ...scoreCard(card, spending, persona), eligible: true };
}

/**
 * Evaluate the cards a user ALREADY holds: what they earn using them optimally,
 * whether they're leaving value on the table, and which card would add the most.
 */
export function evaluateOwned(
  spending: SpendingProfile,
  persona: Persona,
  ownedIds: string[],
): Evaluation {
  const ownedCards = ownedIds.map((id) => CARD_BY_ID[id]).filter(Boolean) as Card[];
  const ownedScores = ownedCards
    .map((c) => scoreOwned(c, spending, persona))
    .sort((a, b) => b.netAnnualRM - a.netAnnualRM);

  const ownedCombo = bestCombo(ownedScores, spending, persona);
  const currentNetAnnualRM = ownedCombo.netAnnualRM;

  // Best possible setup from the full catalogue (respects income eligibility).
  const global = recommend(spending, persona);
  const bestNetAnnualRM = global.combo.netAnnualRM;
  const upsideAnnualRM = Math.max(0, bestNetAnnualRM - currentNetAnnualRM);

  // Marginal value of adding each eligible card the user doesn't own.
  const ownedSet = new Set(ownedIds);
  const candidates = ACTIVE_CARDS.filter(
    (c) => !ownedSet.has(c.id) && global.single.some((s) => s.card.id === c.id),
  );
  const suggestions: AddSuggestion[] = candidates
    .map((card) => {
      const combo = bestCombo([...ownedScores, scoreOwned(card, spending, persona)], spending, persona);
      return { card, addedAnnualRM: combo.netAnnualRM - currentNetAnnualRM };
    })
    .filter((s) => s.addedAnnualRM >= NEGLIGIBLE)
    .sort((a, b) => b.addedAnnualRM - a.addedAnnualRM)
    .slice(0, 3);

  const tips = buildTips(
    { single: ownedScores, combo: ownedCombo, ineligible: [], walletFiltered: [] },
    spending,
  );

  return {
    ownedScores,
    ownedCombo,
    currentNetAnnualRM,
    bestNetAnnualRM,
    upsideAnnualRM,
    suggestions,
    tips,
    alreadyOptimal: upsideAnnualRM < NEGLIGIBLE && suggestions.length === 0,
  };
}
