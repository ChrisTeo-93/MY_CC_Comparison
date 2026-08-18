import type { Card, Persona, WeekendSpending } from "../domain/types";

/**
 * What share of a month's spend lands on Saturday and Sunday, per answer.
 *
 * Two of seven days is 28.6%, which anchors the middle option; the outer two
 * reflect that some people's discretionary spending is almost entirely weekday
 * (commuting, office lunches) and others' is almost entirely weekend.
 */
export const WEEKEND_SHARE: Record<WeekendSpending, number> = {
  weekdays: 0.15,
  mixed: 0.3,
  weekends: 0.5,
};

/**
 * Resolve rules whose eligible share depends on the user rather than the card.
 *
 * A weekend-only rate is worth very different amounts to a weekday commuter and
 * to someone who does all their shopping on Saturday, and only the user knows
 * which they are. Rules marked `shareSource: "weekend"` take their share from
 * the persona's answer; everything else is returned untouched, and an
 * unanswered persona keeps each rule's own estimate.
 *
 * Applied to the catalogue at the entry points (recommend / evaluateOwned) so
 * nothing downstream needs to know about it — including the conditions panel,
 * which then quotes the user's own figure back to them rather than an average.
 */
export function applyPersonaShares(cards: Card[], persona: Persona): Card[] {
  const share = persona.weekendSpending ? WEEKEND_SHARE[persona.weekendSpending] : undefined;
  if (share === undefined) return cards;

  return cards.map((card) => {
    if (!card.earnRules.some((r) => r.shareSource === "weekend")) return card;
    return {
      ...card,
      earnRules: card.earnRules.map((r) =>
        r.shareSource === "weekend" ? { ...r, eligibleShare: share } : r,
      ),
    };
  });
}
