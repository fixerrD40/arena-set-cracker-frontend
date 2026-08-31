import { MtgCard } from '../card/card';
import { compareArenaDeckList } from '../card/arena-collection.filter';
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

export interface ArenaDeckExportLine {
  card: MtgCard;
  quantity: number;
}

export type ArenaDeckExportResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * Serializes assigned deck lines into MTG Arena's paste format.
 * Arena expects set collector numbers, not Scryfall arena_id.
 */
export function formatArenaDeckExport(
  lines: readonly ArenaDeckExportLine[],
  setCode: string
): ArenaDeckExportResult {
  if (lines.length === 0) {
    return { ok: false, error: 'Deck has no cards to export.' };
  }

  const set = setCode.trim().toUpperCase();
  if (!set) {
    return { ok: false, error: 'Set code is missing for this deck.' };
  }

  const missingNumbers = lines
    .filter((line) => !line.card.collectorNumber?.trim())
    .map((line) => line.card.name);
  if (missingNumbers.length > 0) {
    return {
      ok: false,
      error: `Missing Arena export numbers for: ${[...new Set(missingNumbers)].join(', ')}`
    };
  }

  const invalidNumbers: string[] = [];
  const body = [...lines]
    .sort((a, b) => compareArenaDeckList(a.card, b.card))
    .map(({ card, quantity }) => {
      const exportNumber = arenaExportNumber(card.collectorNumber);
      if (exportNumber === null) {
        invalidNumbers.push(card.name);
        return null;
      }
      return `${quantity} ${card.name} (${set}) ${exportNumber}`;
    });

  if (invalidNumbers.length > 0) {
    return {
      ok: false,
      error: `Invalid Arena export numbers for: ${[...new Set(invalidNumbers)].join(', ')}`
    };
  }

  return { ok: true, text: ['Deck', ...(body as string[])].join('\n') };
}

function arenaExportNumber(collectorNumber: string): number | null {
  const match = /^(\d+)/.exec(collectorNumber.trim());
  if (!match) {
    return null;
  }
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}
