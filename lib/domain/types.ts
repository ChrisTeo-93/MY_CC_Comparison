import type { CategoryKey } from "./categories";

export type RewardType = "cashback" | "points" | "miles" | "hybrid";

export type CardNetwork = "Visa" | "Mastercard" | "Amex" | "UnionPay";

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

export interface Persona {
  rewardPreference: RewardPreference;
  incomeBracket: IncomeBracket;
  feeTolerance: FeeTolerance;
  travelFrequency: TravelFrequency;
  effortTolerance: EffortTolerance;
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

export interface CardScore {
  card: Card;
  /** Annual reward value in RM before subtracting the fee. */
  grossAnnualRM: number;
  /** Effective annual fee in RM after waiver logic. */
  effectiveAnnualFee: number;
  /** grossAnnualRM - effectiveAnnualFee. */
  netAnnualRM: number;
  /** Net value after applying the persona preference multiplier (ranking key). */
  adjustedNetRM: number;
  breakdown: CategoryBreakdown[];
  /** True when the user's income meets the card's requirement. */
  eligible: boolean;
  /** Plain-language reasons the card was recommended. */
  reasons: string[];
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
  /** Total annual reward value (RM) across the combo, net of all fees. */
  netAnnualRM: number;
  /** Combined annual fees (RM) after waiver logic. */
  totalAnnualFee: number;
}

export interface RecommendationResult {
  /** Single-card ranking, best first (eligible cards only). */
  single: CardScore[];
  /** Best multi-card portfolio. */
  combo: ComboRecommendation;
  /** Cards excluded purely on income eligibility. */
  ineligible: Card[];
}
