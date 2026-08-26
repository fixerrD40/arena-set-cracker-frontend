import { MtgCard } from '../card/card';
import { ParsedArenaLine } from './deck';

const ARENA_LINE_REGEX = /^(\d+)\s+(.+?)\s+\(([A-Z0-9]+)\)\s+(\d+)$/i;

/**
 * Tokenizes a raw MTG Arena export into structured lines.
 * Skips section headers (e.g. "Deck") and malformed rows.
 */
export function parseArenaText(textBlob: string): ParsedArenaLine[] {
  if (!textBlob?.trim()) return [];

  const lines = textBlob.split('\n').map((line) => line.trim()).filter(Boolean);
  const parsed: ParsedArenaLine[] = [];

  for (const raw of lines) {
    const match = ARENA_LINE_REGEX.exec(raw);
    if (!match) continue;

    const quantity = parseInt(match[1], 10);
    const name = match[2].trim();
    const set = match[3].toUpperCase();
    const collectorNumber = parseInt(match[4], 10);

    if (isNaN(quantity) || !name || isNaN(collectorNumber)) continue;

    parsed.push({ quantity, name, set, collectorNumber, raw });
  }

  return parsed;
}

/**
 * @deprecated Prefer parseArenaText + resolveArenaLinesToCardMap.
 * Kept for any leftover callers; keys by collector number (not catalog id).
 */
export function parseArenaTextToDeckMap(textBlob: string): Map<string, number> {
  const cardMap = new Map<string, number>();
  for (const line of parseArenaText(textBlob)) {
    const key = String(line.collectorNumber);
    cardMap.set(key, (cardMap.get(key) || 0) + line.quantity);
  }
  return cardMap;
}

export interface ArenaResolveResult {
  cards: Map<string, number>;
  unmatched: ParsedArenaLine[];
}

/**
 * Resolves Arena lines against the focused set catalog by case-insensitive name.
 * Unmatched lines are returned for UI stripping notices; they are not stored.
 */
export function resolveArenaLinesToCardMap(
  lines: ParsedArenaLine[],
  catalogCards: MtgCard[]
): ArenaResolveResult {
  const cards = new Map<string, number>();
  const unmatched: ParsedArenaLine[] = [];

  const byName = new Map<string, MtgCard>();
  for (const card of catalogCards) {
    const key = normalizeCardName(card.name);
    if (!byName.has(key)) {
      byName.set(key, card);
    }
  }

  for (const line of lines) {
    const match = byName.get(normalizeCardName(line.name));
    if (!match) {
      unmatched.push(line);
      continue;
    }

    cards.set(match.id, (cards.get(match.id) || 0) + line.quantity);
  }

  return { cards, unmatched };
}

function normalizeCardName(name: string): string {
  return name.trim().toLowerCase();
}
