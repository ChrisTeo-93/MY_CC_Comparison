import type { Card, EarnRule } from "../domain/types";

/**
 * Convert a card's reward unit into RM value earned per RM spent.
 *
 *  - percent:      rate is already a fraction of spend (0.05 => RM0.05 per RM1).
 *  - pointsPerRM:  points earned per RM × RM value of a point.
 *  - milesPerRM:   miles earned per RM × RM value of a mile.
 *
 * This is what makes cashback, points and miles cards directly comparable.
 */
export function rmValuePerRM(card: Card, rule: EarnRule): number {
  switch (rule.unit) {
    case "percent":
      return rule.rate;
    case "pointsPerRM":
      return rule.rate * (card.pointValueRM ?? 0);
    case "milesPerRM":
      return rule.rate * (card.mileValueRM ?? 0);
  }
}

/**
 * Convert a rule's monthly cap (expressed in its own unit) into a cap on RM
 * reward value per month. Returns Infinity when there is no cap.
 */
export function monthlyCapRM(card: Card, rule: EarnRule): number {
  if (rule.monthlyCap === undefined) return Infinity;
  switch (rule.unit) {
    case "percent":
      // Cap is already expressed in RM of rebate.
      return rule.monthlyCap;
    case "pointsPerRM":
      return rule.monthlyCap * (card.pointValueRM ?? 0);
    case "milesPerRM":
      return rule.monthlyCap * (card.mileValueRM ?? 0);
  }
}

/** Human-readable label for a rule's earn rate, e.g. "5% cashback" or "10x points". */
export function rateLabel(rule: EarnRule): string {
  switch (rule.unit) {
    case "percent":
      return `${(rule.rate * 100).toFixed(rule.rate * 100 % 1 === 0 ? 0 : 1)}% cashback`;
    case "pointsPerRM":
      return `${rule.rate}x points`;
    case "milesPerRM":
      return `${rule.rate} miles/RM`;
  }
}

/**
 * Malaysia imposes a RM25/year Service Tax (SST) on principal credit/charge
 * cards under the Service Tax Act — separate from and in addition to the
 * bank's own annual fee, and NOT waivable by the bank's own fee-waiver
 * programs (it's a government charge, not a bank one). Charged per card, so
 * it matters most for combo recommendations: each extra card held adds
 * another RM25/year that its earnings must clear.
 */
export const STANDARD_GOVT_SERVICE_TAX_RM = 25;

/** Resolves a card's govt Service Tax, defaulting to the standard rate. */
export function govtServiceTax(card: Card): number {
  return card.govtTaxRM ?? STANDARD_GOVT_SERVICE_TAX_RM;
}
