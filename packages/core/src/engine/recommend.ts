import { ACTIVE_CARDS } from "../domain/cards";
import type {
  Card,
  Persona,
  RecommendationResult,
  SpendingProfile,
} from "../domain/types";
import { walletsForCard } from "../domain/wallets";
import { bestCombo } from "./combo";
import { scoreCard } from "./score";

/**
 * Top-level recommendation entry point.
 *
 * 1. Score every card against the user's spending + persona.
 * 2. Split into eligible / ineligible by income.
 * 3. Among income-eligible cards, split off those that don't support the user's
 *    chosen mobile wallet (persona.walletPreference) into `walletFiltered`.
 * 4. Rank the remaining eligible cards (persona-adjusted net value) for the
 *    single-card view.
 * 5. Build the best multi-card combo from the same compatible set.
 */
export function recommend(
  spending: SpendingProfile,
  persona: Persona,
  catalogue: Card[] = ACTIVE_CARDS,
): RecommendationResult {
  const scores = catalogue.map((c) => scoreCard(c, spending, persona));

  const ineligible = scores.filter((s) => !s.eligible).map((s) => s.card);

  const walletPref = persona.walletPreference ?? "any";
  const supportsWallet = (card: Card) =>
    walletPref === "any" || walletsForCard(card).includes(walletPref);

  const eligible = scores.filter((s) => s.eligible);
  const compatible = eligible.filter((s) => supportsWallet(s.card));
  const walletFiltered = eligible
    .filter((s) => !supportsWallet(s.card))
    .map((s) => s.card);

  const single = [...compatible].sort((a, b) => b.adjustedNetRM - a.adjustedNetRM);

  const combo = bestCombo(compatible, spending, persona);

  return { single, combo, ineligible, walletFiltered };
}
