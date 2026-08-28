/**
 * Domain deck model. cards is a Map for O(1) quantity lookups in the UI.
 */
export interface MtgDeck {
  id: string;
  setId: string;
  name: string;
  tags: string[];
  notes: string;
  coverCardId: string;
  cards: Map<string, number>;
}

/** Cloud/REST deck shape (cards as a plain object). */
export interface CloudDeckPayload {
  id: string;
  setId: string;
  name: string;
  tags?: string[];
  notes?: string;
  coverCardId?: string;
  cards?: Record<string, number>;
}

/** One tokenized line from an Arena export. */
export interface ParsedArenaLine {
  quantity: number;
  name: string;
  set: string;
  collectorNumber: number;
  raw: string;
}

export interface DeckValidationResult {
  valid: boolean;
  errors: string[];
}

export type CreateDeckConfig = Omit<MtgDeck, 'tags' | 'notes' | 'coverCardId' | 'cards'> &
  Partial<Pick<MtgDeck, 'tags' | 'notes' | 'coverCardId' | 'cards'>>;

export interface DeckDeltaPayload {
  id: string;
  changes: Partial<Omit<MtgDeck, 'id'>>;
}
