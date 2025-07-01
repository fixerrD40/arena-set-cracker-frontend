import { ScryfallSet } from "./scryfall-set";

export interface CardEntry {
  quantity: number;
  name: string;
  set: string;
  collectorNumber: number;
  raw: string;
}

export class Deck {
  id?: number;
  name: string;
  raw: string;
  tags?: string[];
  notes?: string;
  cards: CardEntry[];

  constructor(init: {
    name: string;
    raw: string;
    id?: number;
    tags?: string[];
    notes?: string;
  }, set: ScryfallSet) {
    this.name = init.name;
    this.raw = init.raw;
    this.id = init.id;
    this.tags = init.tags;
    this.notes = init.notes;

    const { valid, errors, parsed } = validateDeck(this.raw, set);
    if (!valid) {
      throw new Error(`Invalid deck "${this.name}":\n - ${errors.join('\n - ')}`);
    }

    this.cards = parsed;
  }
  
  toJSON() {
    const { cards, ...rest } = this;
    return rest;
  }
}

export function parseRaw(input: string): CardEntry[] {
  const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
  const parsed: CardEntry[] = [];
  const regex = /^(\d+)\s+(.+?)\s+\(([A-Z0-9]+)\)\s+(\d+)$/;

  for (const line of lines) {
    const match = regex.exec(line);
    if (!match) continue;

    const [_, qtyStr, name, set, numStr] = match;
    parsed.push({
      quantity: parseInt(qtyStr, 10),
      name,
      set,
      collectorNumber: parseInt(numStr, 10),
      raw: line
    });
  }

  return parsed;
}

export function validateDeck(raw: string, set: ScryfallSet): {
  valid: boolean;
  errors: string[];
  parsed: CardEntry[];
} {
  const errors: string[] = [];

  const parsed = parseRaw(raw);
  if (parsed.length === 0) {
    errors.push('No valid deck lines were found.');
    return { valid: false, errors, parsed: [] };
  }

  const totalCards = parsed.reduce((sum, line) => sum + line.quantity, 0);
  if (totalCards !== 60) {
    errors.push(`Deck must contain exactly 60 cards, but has ${totalCards}`);
  }

  const uniqueSets = new Set(parsed.map(line => line.set));
  if (uniqueSets.size > 1) {
    errors.push(`All cards must be from the same set. Found: ${Array.from(uniqueSets).join(', ')}`);
  }

  const firstSet = parsed[0].set;
  if (firstSet !== set.code.toUpperCase()) {
    errors.push(`Deck uses set "${firstSet}", but expected "${set.code.toUpperCase()}"`);
  }

  return {
    valid: errors.length === 0,
    errors,
    parsed
  };
}
