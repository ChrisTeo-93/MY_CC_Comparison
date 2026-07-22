import { CATEGORY_KEYS } from "@kadcompare/core";
import type { Card, EarnRule } from "@kadcompare/core";
import { getCardsRepository } from "./cardsRepository";

/**
 * Server-side read/write access to the card catalogue. Validation lives here;
 * actual storage is delegated to `cardsRepository.ts`, which picks a real
 * database (Redis, when REDIS_URL is set) or falls back to the repo's own
 * JSON file (`packages/core/src/data/cards.json` — shared with the mobile
 * app) for local dev / any Node host with a writable filesystem.
 *
 * On a read-only serverless platform (e.g. Vercel) without REDIS_URL set,
 * writes won't persist across invocations — see README for provisioning a
 * persistent store.
 *
 * All exports are server-only; never import this from a client component.
 */

const NETWORKS = new Set(["Visa", "Mastercard", "Amex", "UnionPay"]);
const REWARD_TYPES = new Set(["cashback", "points", "miles", "hybrid"]);
const UNITS = new Set(["percent", "pointsPerRM", "milesPerRM"]);
const WAIVER_TYPES = new Set(["spend", "swipes", "always", "none"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);
const STATUSES = new Set(["active", "discontinued"]);
const WALLETS = new Set(["applePay", "googlePay", "samsungPay", "huaweiPay"]);
const CATEGORY_SET = new Set<string>(CATEGORY_KEYS);

export type ValidationResult = { ok: true; card: Card } | { ok: false; errors: string[] };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateEarnRule(rule: unknown, label: string, errors: string[]): void {
  if (typeof rule !== "object" || rule === null) {
    errors.push(`${label}: must be an object`);
    return;
  }
  const r = rule as Record<string, unknown>;
  if (!CATEGORY_SET.has(r.category as string)) {
    errors.push(`${label}: category "${String(r.category)}" is not a known category`);
  }
  if (!isFiniteNumber(r.rate) || (r.rate as number) < 0) {
    errors.push(`${label}: rate must be a number ≥ 0`);
  }
  if (!UNITS.has(r.unit as string)) {
    errors.push(`${label}: unit must be one of percent | pointsPerRM | milesPerRM`);
  }
  if (r.monthlyCap !== undefined && (!isFiniteNumber(r.monthlyCap) || (r.monthlyCap as number) < 0)) {
    errors.push(`${label}: monthlyCap must be a number ≥ 0`);
  }
  if (r.minMonthlySpend !== undefined && (!isFiniteNumber(r.minMonthlySpend) || (r.minMonthlySpend as number) < 0)) {
    errors.push(`${label}: minMonthlySpend must be a number ≥ 0`);
  }
  if (r.excludedCategories !== undefined) {
    if (!Array.isArray(r.excludedCategories)) {
      errors.push(`${label}: excludedCategories must be an array of category keys`);
    } else {
      (r.excludedCategories as unknown[]).forEach((cat, i) => {
        if (!CATEGORY_SET.has(cat as string)) {
          errors.push(`${label}: excludedCategories[${i}] "${String(cat)}" is not a known category`);
        }
      });
    }
  }
}

/** Validate an untrusted object into a Card. Returns the card or a list of errors. */
export function validateCard(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: ["Payload must be an object"] };
  }
  const c = input as Record<string, unknown>;

  if (!isNonEmptyString(c.id) || !/^[a-z0-9-]+$/.test(c.id as string)) {
    errors.push("id must be a non-empty lowercase slug (a-z, 0-9, -)");
  }
  if (!isNonEmptyString(c.name)) errors.push("name is required");
  if (!isNonEmptyString(c.bank)) errors.push("bank is required");
  if (!NETWORKS.has(c.network as string)) errors.push("network must be Visa | Mastercard | Amex | UnionPay");
  if (!REWARD_TYPES.has(c.rewardType as string)) errors.push("rewardType must be cashback | points | miles | hybrid");
  if (!isNonEmptyString(c.color)) errors.push("color is required");
  if (!isFiniteNumber(c.annualFee) || (c.annualFee as number) < 0) errors.push("annualFee must be a number ≥ 0");
  if (!isFiniteNumber(c.minAnnualIncome) || (c.minAnnualIncome as number) < 0) {
    errors.push("minAnnualIncome must be a number ≥ 0");
  }

  const waiver = c.feeWaiver as Record<string, unknown> | undefined;
  if (!waiver || !WAIVER_TYPES.has(waiver.type as string)) {
    errors.push("feeWaiver.type must be spend | swipes | always | none");
  } else if ((waiver.type === "spend" || waiver.type === "swipes")) {
    if (!isFiniteNumber(waiver.threshold) || (waiver.threshold as number) < 0) {
      errors.push("feeWaiver.threshold must be a number ≥ 0 for spend/swipes waivers");
    }
  }

  if (!c.baseRule) errors.push("baseRule is required");
  else validateEarnRule(c.baseRule, "baseRule", errors);

  if (!Array.isArray(c.earnRules)) errors.push("earnRules must be an array");
  else (c.earnRules as unknown[]).forEach((r, i) => validateEarnRule(r, `earnRules[${i}]`, errors));

  if (!Array.isArray(c.perks)) errors.push("perks must be an array of strings");

  if (!CONFIDENCE.has(c.confidence as string)) errors.push("confidence must be high | medium | low");
  if (!isNonEmptyString(c.lastVerified) || Number.isNaN(Date.parse(c.lastVerified as string))) {
    errors.push("lastVerified must be a valid ISO date string");
  }
  if (!isNonEmptyString(c.sourceUrl)) errors.push("sourceUrl is required");

  if (c.pointValueRM !== undefined && !isFiniteNumber(c.pointValueRM)) errors.push("pointValueRM must be a number");
  if (c.mileValueRM !== undefined && !isFiniteNumber(c.mileValueRM)) errors.push("mileValueRM must be a number");
  if (c.govtTaxRM !== undefined && (!isFiniteNumber(c.govtTaxRM) || (c.govtTaxRM as number) < 0)) {
    errors.push("govtTaxRM must be a number ≥ 0 (omit to use the standard RM25/year)");
  }
  if (c.status !== undefined && !STATUSES.has(c.status as string)) errors.push("status must be active | discontinued");
  if (c.wallets !== undefined) {
    if (!Array.isArray(c.wallets)) {
      errors.push("wallets must be an array of wallet keys (applePay, googlePay, samsungPay, huaweiPay)");
    } else {
      (c.wallets as unknown[]).forEach((w, i) => {
        if (!WALLETS.has(w as string)) errors.push(`wallets[${i}] "${String(w)}" is not a known wallet`);
      });
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, card: input as Card };
}

/** Read the full catalogue from the active storage backend. */
export async function getAllCards(): Promise<Card[]> {
  const repo = await getCardsRepository();
  return repo.getAll();
}

export async function getCard(id: string): Promise<Card | undefined> {
  const cards = await getAllCards();
  return cards.find((c) => c.id === id);
}

/**
 * Create or update a card (matched by id). Validates first; returns the saved
 * card or throws an Error whose message is the joined validation errors.
 */
export async function upsertCard(input: unknown): Promise<Card> {
  const result = validateCard(input);
  if (!result.ok) throw new Error(result.errors.join("; "));
  const repo = await getCardsRepository();
  const cards = await repo.getAll();
  const idx = cards.findIndex((c) => c.id === result.card.id);
  if (idx >= 0) cards[idx] = result.card;
  else cards.push(result.card);
  await repo.writeAll(cards);
  return result.card;
}

/** Delete a card by id. Returns true if a card was removed. */
export async function deleteCard(id: string): Promise<boolean> {
  const repo = await getCardsRepository();
  const cards = await repo.getAll();
  const next = cards.filter((c) => c.id !== id);
  if (next.length === cards.length) return false;
  await repo.writeAll(next);
  return true;
}
