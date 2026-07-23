// src/app/shared/models/deck/deck.ts

/**
 * Idiomatic Domain Interface
 * Reflects your rich application UI state (uses Map instead of a raw DB array).
 */
export interface MtgDeck {
  id: string;
  setId: string;
  name: string;
  tags: string[];
  notes: string;
  cards: Map<string, number>; // Rich application state supporting .get() and .has()
}

/**
 * Idiomatic Cloud Payload Interface
 * Reflects a standard over-the-wire JSON REST endpoint contract.
 */
export interface CloudDeckPayload {
  id: string;
  setId: string;
  name: string;
  tags?: string[];
  notes?: string;
  cards?: Record<string, number>; // Standard JSON dictionary format
}


// ==========================================================
// 3. ARENA PARSING & BUSINESS VALIDATION TOKENS
// ==========================================================

/**
 * Structural segment output representing a successfully tokenized line from an Arena export block.
 */
export interface ParsedArenaLine {
  quantity: number;
  name: string;
  set: string;
  collectorNumber: number;
  raw: string;
}

/**
 * Operational invariant result structure following a validation check on an incoming deck dataset.
 */
export interface DeckValidationResult {
  valid: boolean;
  errors: string[];
}


// ==========================================================
// 4. ARCHITECTURAL UTILITY TYPES
// ==========================================================

/**
 * Metadata parameters used when creating a brand-new workspace deck instance from the UI layer.
 * Marks fields like tags, notes, and maps as optional since they start blank.
 */
export type CreateDeckConfig = Omit<MtgDeck, 'tags' | 'notes' | 'cards'> & Partial<Pick<MtgDeck, 'tags' | 'notes' | 'cards'>>;

/**
 * Contract used when updating an existing record via transactional outbox state changes.
 * Enforces your strict data ID tracking rules while letting any property change fluidly.
 */
export interface DeckDeltaPayload {
  id: string;
  changes: Partial<Omit<MtgDeck, 'id'>>;
}
