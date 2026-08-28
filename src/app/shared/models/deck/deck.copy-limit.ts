import { MtgCard } from '../card/card';
import { isBasicLand } from '../card/arena-collection.filter';

export const DEFAULT_DECK_COPY_LIMIT = 4;
export const CONSTRUCTED_DECK_SIZE = 60;

const COUNT_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12
};

const ANY_NUMBER = /a deck can have any number of cards named/i;
const UP_TO = /a deck can have up to ([a-z]+|\d+) cards named/i;

/**
 * Arena constructed: four copies, unless the card is a basic land or
 * its oracle text raises or removes that cap (Nazgûl, Relentless Rats, …).
 */
export function deckCopyLimit(card: MtgCard): number {
  if (isBasicLand(card)) {
    return Number.POSITIVE_INFINITY;
  }

  if (ANY_NUMBER.test(card.oracleText)) {
    return Number.POSITIVE_INFINITY;
  }

  const upTo = card.oracleText.match(UP_TO);
  if (upTo) {
    return parseCopyCount(upTo[1]) ?? Number.POSITIVE_INFINITY;
  }

  return DEFAULT_DECK_COPY_LIMIT;
}

/** Arena replaces the four pips with ∞ when the card is allowed past four. */
export function showsInfinityCopyMark(card: MtgCard): boolean {
  return deckCopyLimit(card) > DEFAULT_DECK_COPY_LIMIT;
}

function parseCopyCount(raw: string): number | null {
  if (/^\d+$/.test(raw)) {
    return parseInt(raw, 10);
  }
  return COUNT_WORDS[raw.toLowerCase()] ?? null;
}
