import { CARDS } from "../domain/cards";
import type {
  Card,
  Persona,
  RecommendationResult,
  SpendingProfile,
} from "../domain/types";
import { bestCombo } from "./combo";
import { scoreCard } from "./score";

/**
 * Top-level recommendation entry point.
 *
 * 1. Score every card against the user's spending + persona.
 * 2. Split into eligible / ineligible by income.
 * 3. Rank eligible cards (persona-adjusted net value) for the single-card view.
 * 4. Build the best multi-card combo from the eligible set.
 */
export function recommend(
  spending: SpendingProfile,
  persona: Persona,
  catalogue: Card[] = CARDS,
): RecommendationResult {
  const scores = catalogue.map((c) => scoreCard(c, spending, persona));

  const single = scores
    .filter((s) => s.eligible)
    .sort((a, b) => b.adjustedNetRM - a.adjustedNetRM);

  const ineligible = scores.filter((s) => !s.eligible).map((s) => s.card);

  const combo = bestCombo(scores, spending, persona);

  return { single, combo, ineligible };
}
