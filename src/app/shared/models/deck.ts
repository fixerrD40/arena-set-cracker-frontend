// src/app/shared/models/deck/deck.ts
import { DeckEntity } from '../../core/sqlite/sqlite.schema';
import { ScryfallSet } from '../../core/services/scryfall/models/set.scryfall';

export interface MtgDeckConfig {
  id: string;
  setId: string;
  name: string;
  tags?: string[];
  notes?: string;
  cards?: Map<string, number>; // cardName -> quantity
}

export interface ParsedLine {
  quantity: number;
  name: string;
  set: string;
  collectorNumber: number;
  raw: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class MtgDeck {
  id: string;
  setId: string;
  name: string;
  tags: string[];
  notes: string;
  cards: Map<string, number>;

  constructor(init: MtgDeckConfig) {
    this.id = init.id;
    this.setId = init.setId;
    this.name = init.name;
    this.tags = init.tags ?? [];
    this.notes = init.notes ?? '';
    this.cards = init.cards ?? new Map<string, number>();
  }

  /**
   * ATOMIC ASSIGNMENT ENGINE: Updates the quantity of a card inside this deck matrix.
   * If the quantity falls to 0 or below, it cleanly evicts the card entirely.
   *
   * @param cardId The target unique string identifier for the card
   * @param quantity The new absolute count or delta adjustment assignment
   */
  public assignCard(cardId: string, quantity: number): void {
    if (quantity <= 0) {
      // Evict the map reference completely to save space and keep JSON data footprints clean
      this.cards.delete(cardId);
    } else {
      // Set or update the running dictionary assignment quantity
      this.cards.set(cardId, quantity);
    }
  }

  /**
   * INCREMENT ENGINE: Adds 1 (or a custom amount) to a card's quantity.
   * If the card doesn't exist in the deck yet, it initializes it automatically.
   *
   * @param cardId The target unique string identifier for the card
   * @param amount The value to add (defaults to 1)
   */
  public incrementCard(cardId: string, amount: number = 1): void {
    const currentQuantity = this.cards.get(cardId) ?? 0;

    // Add the delta adjustment onto the running count
    this.cards.set(cardId, currentQuantity + amount);
  }

  /**
   * DECREMENT ENGINE: Subtracts 1 (or a custom amount) from a card's quantity.
   * If the quantity drops to 0 or below, it cleanly deletes the card from the map.
   *
   * @param cardId The target unique string identifier for the card
   * @param amount The value to subtract (defaults to 1)
   */
  public decrementCard(cardId: string, amount: number = 1): void {
    const currentQuantity = this.cards.get(cardId);

    // Guard Clause: If the card isn't even in the deck, do nothing
    if (currentQuantity === undefined) {
      return;
    }

    const newQuantity = currentQuantity - amount;

    if (newQuantity <= 0) {
      // Clean eviction to keep JSON payloads lightweight
      this.cards.delete(cardId);
    } else {
      // Save the updated count
      this.cards.set(cardId, newQuantity);
    }
  }

  // ==========================================
  // TEXT PARSING & VALIDATION ENGINE (The Core Business Logic)
  // ==========================================

  /**
   * Tokenizes an Arena export string into clean structural segments
   */
  static parseRaw(rawText: string): ParsedLine[] {
    if (!rawText) return [];

    // Regex matches typical MTG Arena layout: "1 Dawn of a New Age (LTR) 5"
    const arenaLineRegex = /^(\d+)\s+(.+?)\s+\(([A-Z0-9]{3,4})\)\s+(\d+)$/i;

    return rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line !== 'Deck') // Skip the header line
      .map(line => {
        const match = line.match(arenaLineRegex);
        if (!match) return null;

        return {
          quantity: parseInt(match[1], 10),
          name: match[2],
          set: match[3].toUpperCase(),
          collectorNumber: parseInt(match[4], 10),
          raw: line
        };
      })
      .filter((line): line is ParsedLine => line !== null);
  }

  /**
   * Validates if a raw text dump meets your application puzzle state requirements
   */
  static validateDeck(rawText: string, expectedSet: ScryfallSet): ValidationResult {
    const parsedLines = MtgDeck.parseRaw(rawText);
    const errors: string[] = [];

    if (parsedLines.length === 0) {
      errors.push('No valid deck lines found.');
      return { valid: false, errors };
    }

    // Correct calculation: Sum the quantity tokens from every line item row
    const totalCount = parsedLines.reduce((sum, line) => sum + line.quantity, 0);

    if (totalCount !== 60) {
      errors.push(`Deck must contain exactly 60 cards. Found ${totalCount}.`);
    }

    // Ensure every token matches your upper case target boundaries
    const targetCode = expectedSet.code.toUpperCase();
    const hasMismatchedSet = parsedLines.some(line => line.set !== targetCode);

    if (hasMismatchedSet) {
      errors.push(`All cards must be from the same set. Expected "${targetCode}".`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Rich Factory: Constructs a live workspace deck by parsing an Arena text block directly,
   * throwing strict validation errors if layout bounds are broken.
   */
  static fromArenaExport(metadata: { id: string; name: string }, rawText: string, expectedSet: ScryfallSet): MtgDeck {
    const validation = MtgDeck.validateDeck(rawText, expectedSet);
    if (!validation.valid) {
      throw new Error(validation.errors.join(' | '));
    }

    const parsedLines = MtgDeck.parseRaw(rawText);
    const cardMap = new Map<string, number>();

    parsedLines.forEach(line => {
      const existing = cardMap.get(line.name) || 0;
      cardMap.set(line.name, existing + line.quantity);
    });

    return new MtgDeck({
      id: metadata.id,
      setId: expectedSet.id, // Maps local key bounds safely
      name: metadata.name,
      cards: cardMap
    });
  }

  // ==========================================
  // EXISTING INFRASTRUCTURE COUPLING
  // ==========================================
  get totalCardCount(): number {
    return Array.from(this.cards.values()).reduce((sum, qty) => sum + qty, 0);
  }

  get isValidAssignment(): boolean {
    return this.totalCardCount === 60;
  }

  /**
   * SERIALIZATION HOOK: Formats the entire deep instance structure into a plain
   * JSON-safe JavaScript object structure that your network outbox pattern demands.
   */
  toJSON(): Record<string, any> {
    // Convert the JavaScript Map into a standard plain object dictionary
    const cardsDictionary: Record<string, number> = {};
    this.cards.forEach((quantity, cardId) => {
      cardsDictionary[cardId] = quantity;
    });

    return {
      id: this.id,
      setId: this.setId,
      name: this.name,
      tags: this.tags,
      notes: this.notes,
      cards: cardsDictionary // Plain JSON dictionary payload can be serialized safely
    };
  }

  // ==========================================
  // SQLITE PERSISTENCE LAYOUTS
  // ==========================================

  /**
   * Static Factory: Restores your database hydration bridge.
   * Creates a fresh domain deck model from a raw SQLite table row.
   *
   * Note: This handles base metadata. Populating the `cards` Map workspace
   * matrix requires a secondary line item join query handled by your DeckService.
   */
  static fromSqlite(entity: DeckEntity, joinedCards?: { cardId: string; quantity: number }[]): MtgDeck {
    const cardMap = new Map<string, number>();

    // If card lines are retrieved from the deck_cards cross-table, unpack them into our workspace Map
    if (joinedCards) {
      joinedCards.forEach(row => cardMap.set(row.cardId, row.quantity));
    }

    return new MtgDeck({
      id: entity.id,
      setId: entity.setId,
      name: entity.name,
      tags: entity.tags as string[], // Drizzle handles the JSON text column parsing automatically
      notes: entity.notes,
      cards: cardMap
    });
  }

  toSqlite(): DeckEntity {
    return {
      id: this.id,
      setId: this.setId,
      name: this.name,
      tags: this.tags,
      notes: this.notes,
      createdAt: new Date().toISOString()
    };
  }
}
