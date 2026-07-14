import type { CategoryKey } from "../domain/categories";
import { CATEGORY_BY_KEY } from "../domain/categories";
import type { Card, CardConditions, EarnCondition, FeeCondition } from "../domain/types";
import { govtServiceTax, monthlyCapRM, rateLabel, rmValuePerRM } from "./normalize";

/**
 * Translate a card's earn rules + fee waiver into the plain-language conditions a
 * normal person actually needs to know: how much you must spend to unlock a rate,
 * how much spend it takes to max out the monthly cap, and whether the user's own
 * spending currently clears each hurdle. This is the product's differentiator —
 * banks hide the "spend RM3,000 to get RM60" gimmick in fine print.
 */
export function buildConditions(
  card: Card,
  resolved: Record<CategoryKey, number>,
  totalMonthly: number,
): CardConditions {
  const earn: EarnCondition[] = card.earnRules.map((rule) => {
    const rmPerRM = rmValuePerRM(card, rule);
    const capRM = monthlyCapRM(card, rule);
    const hasCap = Number.isFinite(capRM);
    const yourSpend = rule.category === "general" ? totalMonthly : resolved[rule.category] ?? 0;
    const unlocked = rule.minMonthlySpend === undefined || totalMonthly >= rule.minMonthlySpend;
    const yourReward = yourSpend * rmPerRM;

    return {
      category: rule.category,
      label: rule.category === "general" ? "All spend" : CATEGORY_BY_KEY[rule.category].label,
      rateLabel: rateLabel(rule),
      maxMonthlyRewardRM: hasCap ? capRM : undefined,
      spendToMaxRM: hasCap && rmPerRM > 0 ? capRM / rmPerRM : undefined,
      minTotalSpendRM: rule.minMonthlySpend,
      yourMonthlySpendRM: yourSpend,
      unlocked,
      hitsCap: hasCap && yourReward >= capRM - 1e-9,
      note: rule.notes,
    };
  });

  // Show the highest-ceiling rewards first (uncapped rules sort last).
  earn.sort(
    (a, b) =>
      (b.maxMonthlyRewardRM ?? Number.MAX_SAFE_INTEGER) -
      (a.maxMonthlyRewardRM ?? Number.MAX_SAFE_INTEGER),
  );

  return {
    earn,
    fee: buildFeeCondition(card, totalMonthly * 12),
    baseRateLabel: rateLabel(card.baseRule),
    yourMonthlyTotalRM: totalMonthly,
  };
}

function buildFeeCondition(card: Card, annualSpend: number): FeeCondition {
  const govtTaxRM = govtServiceTax(card);
  const govtNote = ` Plus a mandatory RM${govtTaxRM}/year government service tax (SST) — not bank-waivable.`;

  if (card.annualFee === 0 || card.feeWaiver.type === "always") {
    return {
      kind: "free",
      annualFee: card.annualFee,
      govtTaxRM,
      text: `No annual fee.${govtNote}`,
      met: true,
    };
  }
  const w = card.feeWaiver;
  if (w.type === "spend") {
    const threshold = w.threshold ?? 0;
    const perMonth = Math.round(threshold / 12);
    return {
      kind: "waivable",
      annualFee: card.annualFee,
      govtTaxRM,
      text: `Waive the RM${card.annualFee} annual fee by spending RM${threshold.toLocaleString("en-MY")}/year (~RM${perMonth.toLocaleString("en-MY")}/mo).${govtNote}`,
      met: annualSpend >= threshold,
    };
  }
  if (w.type === "swipes") {
    return {
      kind: "waivable",
      annualFee: card.annualFee,
      govtTaxRM,
      text: `Waive the RM${card.annualFee} annual fee with ${w.threshold ?? 12} transactions/year.${govtNote}`,
      met: annualSpend > 0,
    };
  }
  return {
    kind: "fixed",
    annualFee: card.annualFee,
    govtTaxRM,
    text: `RM${card.annualFee} annual fee — not waivable.${govtNote}`,
    met: false,
  };
}
