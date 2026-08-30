import { MtgDeck, CloudDeckPayload, coerceDeckStatus, coerceDeckThemes } from './deck';
import { DeckRow, DeckCardRow, DeckInsert } from '../../../core/sqlite/sqlite.schema';

/** Joins a deck row with deck_cards lines into a domain Map. */
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
    coverCardId: deckRow.coverCardId || '',
    status: coerceDeckStatus(deckRow.status),
    themes: coerceDeckThemes(deckRow.themes),
    cards: cardMap
  };
}

/** Serializes deck metadata for SQLite (cards go through deck_cards separately). */
export function mapDeckToInsert(deck: MtgDeck): DeckInsert {
  return {
    id: deck.id,
    setId: deck.setId,
    name: deck.name,
    notes: deck.notes,
    coverCardId: deck.coverCardId || '',
    themes: [...deck.themes],
    status: deck.status
    // createdAt omitted; column $default fills it
  };
}

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
    coverCardId: payload.coverCardId || '',
    status: coerceDeckStatus(payload.status),
    themes: coerceDeckThemes(payload.themes),
    cards: cardMap
  };
}

export function mapDeckToJson(deck: MtgDeck): CloudDeckPayload {
  return {
    id: deck.id,
    setId: deck.setId,
    name: deck.name,
    notes: deck.notes,
    status: deck.status,
    themes: [...deck.themes],
    coverCardId: deck.coverCardId,
    cards: Object.fromEntries(deck.cards)
  };
}
