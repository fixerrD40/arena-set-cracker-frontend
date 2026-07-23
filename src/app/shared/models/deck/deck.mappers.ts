// src/app/shared/models/deck/deck.mappers.ts
import { MtgDeck, CloudDeckPayload } from './deck';
import { DeckRow, DeckCardRow, DeckInsert } from '../../../core/storage/sqlite/sqlite.schema';

// ==========================================================
// 1. DATABASE BOUNDARY MAPPERS
// ==========================================================

/**
 * DATABASE INPUT WIRE:
 * Translates a raw SQLite deck row and its child relational cards into your pure application domain structure.
 */
export function mapRowToDeck(
  deckRow: DeckRow,
  joinedCardLines: DeckCardRow[] = []
): MtgDeck {
  const cardMap = new Map<string, number>();

  joinedCardLines.forEach(line => {
    cardMap.set(line.cardId, line.quantity);
  });

  return {
    id: deckRow.id,
    setId: deckRow.setId,
    name: deckRow.name,
    notes: deckRow.notes || '',
    tags: Array.isArray(deckRow.tags) ? deckRow.tags : [], // Fallback normalization guard
    cards: cardMap
  };
}

/**
 * DATABASE OUTPUT WIRE:
 * Serializes your UI model into the exact flat shape your database insertion layer requires.
 */
export function mapDeckToInsert(deck: MtgDeck): DeckInsert {
  return {
    id: deck.id,
    setId: deck.setId,
    name: deck.name,
    notes: deck.notes,
    tags: deck.tags // Drizzle mode: 'json' stringifies this array automatically on write
    // Note: 'createdAt' is omitted; it populates via its column $default generator
  };
}

// ==========================================================
// 2. NETWORK REST API BOUNDARY MAPPERS
// ==========================================================

/**
 * NETWORK INPUT WIRE:
 * Translates a raw over-the-wire JSON network payload securely back into your domain model structure.
 */
export function mapJsonToDeck(payload: CloudDeckPayload): MtgDeck {
  const cardMap = new Map<string, number>();

  if (payload.cards && typeof payload.cards === 'object') {
    Object.entries(payload.cards).forEach(([cardId, qty]) => {
      cardMap.set(cardId, qty);
    });
  }

  return {
    id: payload.id,
    setId: payload.setId,
    name: payload.name || 'Unnamed Deck',
    notes: payload.notes || '',
    tags: payload.tags || [],
    cards: cardMap
  };
}

/**
 * NETWORK OUTPUT WIRE:
 * Serializes your UI model into a clean JSON literal dictionary for standard REST API endpoints.
 */
export function mapDeckToJson(deck: MtgDeck): CloudDeckPayload {
  return {
    id: deck.id,
    setId: deck.setId,
    name: deck.name,
    notes: deck.notes,
    tags: deck.tags,
    cards: Object.fromEntries(deck.cards) // Clean native mapping of active JS Maps to plain objects
  };
}
