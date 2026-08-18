import type { CategoryKey } from "./categories";

export type RewardType = "cashback" | "points" | "miles" | "hybrid";

export type CardNetwork = "Visa" | "Mastercard" | "Amex" | "UnionPay";

/** Mobile wallets a card can be added to (tokenised contactless payments). */
export type MobileWallet = "applePay" | "googlePay" | "samsungPay" | "huaweiPay";

/** How an earn rate is expressed before normalisation to RM value. */
export type EarnUnit = "percent" | "pointsPerRM" | "milesPerRM";

export interface EarnRule {
  /** Category this rule applies to, or "general" as the catch-all. */
  category: CategoryKey;
  /** Numeric rate, interpreted according to `unit`. */
  rate: number;
  unit: EarnUnit;
  /**
   * Optional cap on the BONUS portion, expressed as max reward value per month
   * in the rule's own unit (RM for cashback, points for points, miles for miles).
   * Spend beyond the cap earns the card's base rate instead.
   */
  monthlyCap?: number;
  /** Minimum total monthly spend (RM) required to unlock this rule. */
  minMonthlySpend?: number;
  /**
   * Opt into sharing one monthly cap pool with every other rule on this card
   * carrying the same id — for banks that cap a GROUP of categories jointly
   * ("5% on groceries and dining, capped RM30/month between them") rather than
   * each separately. Rules in a group should carry the same `monthlyCap`; if
   * they differ, the smallest is treated as the shared ceiling.
   *
   * Note this is only needed for caps shared ACROSS rules. A single rule's cap
   * is always one pool across every category that rule serves, which matters
   * most for a `general` omni-rule: its cap is a monthly ceiling for the card,
   * not a fresh allowance per spending category.
   */
  capGroup?: string;
  /**
   * Categories this rule does NOT apply to — mainly relevant for a
   * `category: "general"` rule (an omni-boost across every category by
   * default), which banks commonly carve out: e-wallet reloads, bills/
   * utilities and government payments are frequently excluded from "earn on
   * everything" promotions even though the headline rate sounds unconditional.
   * Excluded categories fall back to the card's baseRule instead.
   */
  excludedCategories?: CategoryKey[];
  /**
   * Fraction (0–1) of this category's spend that the rate actually reaches, for
   * bonuses restricted to a subset of transactions. Weekend-only rates are the
   * common Malaysian case: a headline "5% cashback" that in fact applies on
   * Saturdays and Sundays only reaches roughly 30% of a typical month's spend.
   * Spend outside the restriction falls back to the card's base rate.
   *
   * Unset means 1 — the rate applies to every ringgit in the category. Set this
   * ONLY where the share can be estimated defensibly; for a restriction whose
   * impact can't be estimated (e.g. a minimum per-transaction amount, where we
   * don't model transaction sizes), leave it unset and state the restriction in
   * `conditionLabel` instead, so the user is told about it without the engine
   * inventing a number.
   */
  eligibleShare?: number;
  /**
   * Marks the KIND of restriction, so the eligible share can come from the
   * user's own answer instead of a card-level estimate. "weekend" resolves from
   * `Persona.weekendSpending`; `eligibleShare` stays as the fallback for when
   * that hasn't been answered.
   */
  shareSource?: "weekend";
  /**
   * Plain-language statement of what restricts this rate — e.g. "weekends only
   * (Sat/Sun)" or "min RM100 per transaction". Shown in the earning-conditions
   * panel. Independent of `eligibleShare`: a restriction can be disclosed
   * without being quantified.
   */
  conditionLabel?: string;
  /** Human-readable caveat shown in the UI. */
  notes?: string;
}

/**
 * How much to trust a card's figures, based on how they were sourced.
 *  - high:   corroborated across the bank's own terms + multiple credible sources
 *  - medium: cross-checked across credible secondary sources, not primary T&C
 *  - low:    single/uncertain source or not yet re-verified — treat with caution
 */
export type DataConfidence = "high" | "medium" | "low";

export type FeeWaiverType = "spend" | "swipes" | "always" | "none";

export interface FeeWaiver {
  type: FeeWaiverType;
  /** Annual spend (RM) or number of swipes/year required, depending on type. */
  threshold?: number;
}

export interface Card {
  id: string;
  name: string;
  bank: string;
  network: CardNetwork;
  rewardType: RewardType;
  /** Tailwind-friendly hex used for the card visual. */
  color: string;

  annualFee: number;
  feeWaiver: FeeWaiver;
  /** Minimum gross annual income (RM) to be eligible. */
  minAnnualIncome: number;
  /**
   * Malaysia's RM25/year government Service Tax (SST) on credit/charge cards —
   * separate from and in addition to the bank's own annual fee, and not
   * waivable by the bank's own fee-waiver programs. Unset defaults to the
   * standard RM25 (see STANDARD_GOVT_SERVICE_TAX_RM in engine/score.ts); only
   * set this when a specific card is verified to have it absorbed/exempted.
   */
  govtTaxRM?: number;

  /** Category-specific accelerated earn rules. */
  earnRules: EarnRule[];
  /** Fallback rule for any category without a specific rule. */
  baseRule: EarnRule;

  /** RM value of one reward point (for points cards). */
  pointValueRM?: number;
  /** RM value of one air mile (for miles cards). */
  mileValueRM?: number;

  /** Qualitative perks — surfaced but not scored in the MVP. */
  perks: string[];

  /**
   * Mobile wallets this card can be added to. When unset, support is derived
   * from the card network (see walletsForCard / defaultWalletsForNetwork in
   * domain/wallets.ts) — set an explicit list only to override that heuristic
   * for a card whose real support is known to differ.
   */
  wallets?: MobileWallet[];

  /** Freshness metadata — directly addresses the "outdated info" problem. */
  lastVerified: string; // ISO date
  sourceUrl: string;
  /** How much to trust the figures above, given how they were sourced. */
  confidence: DataConfidence;
  /** Optional: shown when a card was discontinued/renamed or otherwise needs a caveat. */
  dataNote?: string;
  /** Lifecycle status. Discontinued cards are kept out of recommendations but stay editable. */
  status?: "active" | "discontinued";
  /**
   * Admin-only curation flag: set true to mark a card as needing human review
   * (e.g. figures sourced from secondary snippets, not yet confirmed against
   * primary bank T&C). Purely a workflow marker surfaced in /admin — it does
   * NOT affect scoring, recommendations, or the public UI.
   */
  needsReview?: boolean;
}

/** Monthly spend (RM) per category. Missing keys fall back to persona defaults. */
export type SpendingProfile = Partial<Record<CategoryKey, number>>;

export type RewardPreference = "cashback" | "points" | "miles" | "flexible";
export type IncomeBracket = "under36k" | "36to60k" | "60to100k" | "over100k";
export type FeeTolerance = "noFee" | "ifWorthIt" | "premiumOk";
export type TravelFrequency = "never" | "sometimes" | "often";
export type EffortTolerance = "single" | "multi";
/** How much of a user's spending lands on Sat/Sun — drives weekend-only rates. */
export type WeekendSpending = "weekdays" | "mixed" | "weekends";
/** Which mobile wallet the user pays with — or "any" if they don't mind. */
export type WalletPreference = MobileWallet | "any";

export interface Persona {
  rewardPreference: RewardPreference;
  incomeBracket: IncomeBracket;
  feeTolerance: FeeTolerance;
  travelFrequency: TravelFrequency;
  effortTolerance: EffortTolerance;
  /**
   * The mobile wallet the user pays with. When set to a specific wallet, cards
   * that don't support it are pulled out of the ranking/combo into
   * `RecommendationResult.walletFiltered`. Optional; treated as "any" (no
   * filtering) when unset.
   */
  walletPreference?: WalletPreference;
  /**
   * How weekend-heavy their spending is. Several Malaysian cards pay their
   * headline rate on Saturdays and Sundays only, so this materially changes what
   * those cards are worth. Optional; unset falls back to each rule's own
   * `eligibleShare` estimate.
   */
  weekendSpending?: WeekendSpending;
}

/** Per-category contribution to a card's annual value. */
export interface CategoryBreakdown {
  category: CategoryKey;
  monthlySpend: number;
  /** Annual reward value in RM attributed to this category. */
  annualValueRM: number;
  /** True when the monthly cap limited the earned reward. */
  capped: boolean;
  rateLabel: string;
}

/**
 * Plain-language "what you must spend to actually earn this" for one earn rule.
 * This is the USP: surface the bank's hidden conditions, not just the reward.
 */
export interface EarnCondition {
  category: CategoryKey;
  label: string;
  rateLabel: string;
  /** Max RM reward per month from this rule, when capped. */
  maxMonthlyRewardRM?: number;
  /** Category spend per month needed to reach that cap. */
  spendToMaxRM?: number;
  /** Minimum total monthly spend required to unlock this rate. */
  minTotalSpendRM?: number;
  /** The monthly spend this rule sees for the current user. */
  yourMonthlySpendRM: number;
  /** Whether the user's spend currently unlocks this rate. */
  unlocked: boolean;
  /** Whether the user's spend already maxes the cap. */
  hitsCap: boolean;
  /**
   * Human-readable labels of categories this rule does NOT cover (relevant
   * for "general"/omni rules only) — e.g. ["E-Wallet Reloads", "Bills &
   * Utilities"]. Empty/undefined means the rule is genuinely unrestricted:
   * every transaction type counts, unlike cards that carve out exclusions.
   */
  excludedLabels?: string[];
  /** What restricts this rate, when something does (see EarnRule.conditionLabel). */
  conditionLabel?: string;
  /** Share of category spend the rate reaches, when restricted (1 = all of it). */
  eligibleShare?: number;
  note?: string;
}

export interface FeeCondition {
  kind: "free" | "waivable" | "fixed";
  annualFee: number;
  /** Malaysia's mandatory govt Service Tax for this card (see Card.govtTaxRM). */
  govtTaxRM: number;
  text: string;
  /** Whether the user's spend already meets the waiver (or there is no fee). */
  met: boolean;
}

/** Everything needed to explain, in plain language, how a card actually pays out. */
export interface CardConditions {
  earn: EarnCondition[];
  fee: FeeCondition;
  baseRateLabel: string;
  yourMonthlyTotalRM: number;
}

export interface CardScore {
  card: Card;
  /** Annual reward value in RM before subtracting the fee. */
  grossAnnualRM: number;
  /** Effective annual fee in RM after waiver logic (bank fee only, not govt tax). */
  effectiveAnnualFee: number;
  /** Malaysia's mandatory govt Service Tax (RM25/yr default) — not bank-waivable. */
  govtTaxRM: number;
  /** grossAnnualRM - effectiveAnnualFee - govtTaxRM. */
  netAnnualRM: number;
  /** Net value after applying the persona preference multiplier (ranking key). */
  adjustedNetRM: number;
  breakdown: CategoryBreakdown[];
  /** True when the user's income meets the card's requirement. */
  eligible: boolean;
  /** Plain-language reasons the card was recommended. */
  reasons: string[];
  /** The spend conditions required to actually earn the rewards. */
  conditions: CardConditions;
}

export interface ComboMember {
  card: Card;
  /** Categories this card is the chosen earner for, within the combo. */
  assignedCategories: CategoryKey[];
  /** Annual RM value this card contributes within the combo. */
  contributionRM: number;
}

export interface ComboRecommendation {
  members: ComboMember[];
  /** Total annual reward value (RM) across the combo, net of all fees + govt tax. */
  netAnnualRM: number;
  /** Combined bank annual fees (RM) after waiver logic (not govt tax). */
  totalAnnualFee: number;
  /** Combined mandatory govt Service Tax (RM) across every card in the combo. */
  totalGovtTaxRM: number;
}

/** A card outside the current set that would earn more if it were taken on. */
export interface AddSuggestion {
  card: Card;
  /** Extra net RM/year in the best achievable setup once this card is available. */
  addedAnnualRM: number;
  /**
   * Cards the user already holds that would stop earning anything once this one
   * is in the mix — i.e. this is a swap, not a pure addition. Empty/undefined
   * means everything they hold keeps a job. Worth stating, because a displaced
   * card can be cancelled and its RM25/year govt tax stopped, and because
   * "add this" reads as "keep all of yours and add one more".
   */
  replaces?: Card[];
}

export interface RecommendationResult {
  /** Single-card ranking, best first (eligible cards only). */
  single: CardScore[];
  /** Best multi-card portfolio. */
  combo: ComboRecommendation;
  /** Cards excluded purely on income eligibility. */
  ineligible: Card[];
  /**
   * Cards excluded purely because they don't support the user's chosen mobile
   * wallet (persona.walletPreference). Empty when the preference is "any" or
   * unset. These are otherwise income-eligible — they're hidden from the
   * ranking/combo only for wallet compatibility.
   */
  walletFiltered: Card[];
  /**
   * Cards deliberately left OUT of the combo that would still add value if the
   * user were willing to carry one more. The combo is capped at 3 cards and
   * routes whole categories at a time, so it can't express "hold a 4th card" or
   * "put just the cap overflow here" — this surfaces that value explicitly,
   * rather than smuggling a non-recommended card into the tips.
   */
  additions: AddSuggestion[];
}
