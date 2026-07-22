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
   * Categories this rule does NOT apply to — mainly relevant for a
   * `category: "general"` rule (an omni-boost across every category by
   * default), which banks commonly carve out: e-wallet reloads, bills/
   * utilities and government payments are frequently excluded from "earn on
   * everything" promotions even though the headline rate sounds unconditional.
   * Excluded categories fall back to the card's baseRule instead.
   */
  excludedCategories?: CategoryKey[];
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
}

/** Monthly spend (RM) per category. Missing keys fall back to persona defaults. */
export type SpendingProfile = Partial<Record<CategoryKey, number>>;

export type RewardPreference = "cashback" | "points" | "miles" | "flexible";
export type IncomeBracket = "under36k" | "36to60k" | "60to100k" | "over100k";
export type FeeTolerance = "noFee" | "ifWorthIt" | "premiumOk";
export type TravelFrequency = "never" | "sometimes" | "often";
export type EffortTolerance = "single" | "multi";
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
}
