import type { Card } from "./types";
import cardsData from "../data/cards.json";

/**
 * Card catalogue. The source of truth is `packages/core/src/data/cards.json`,
 * edited via the web app's /admin editor (or by hand) so figures can be kept
 * current — directly addressing the "outdated info" problem. The JSON import is
 * widened by TypeScript, so we assert the validated `Card[]` shape here; writes
 * go through the web app's `lib/data/cardStore.ts`, which validates before
 * persisting.
 *
 * See data/cards.json for the per-card verification notes and the mid-2026
 * research pass that corrected the original seed figures. This module is part
 * of `@kadcompare/core`, shared by both the web app and the mobile app.
 */
export const CARDS = cardsData as unknown as Card[];

/** Only cards that are currently offered — what recommendations draw from. */
export const ACTIVE_CARDS: Card[] = CARDS.filter((c) => c.status !== "discontinued");

export const CARD_BY_ID: Record<string, Card> = CARDS.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<string, Card>,
);
