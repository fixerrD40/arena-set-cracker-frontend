import { ColorIdentity, mapColorKeyToValue } from "./color";
import { ScryfallSet } from "./scryfall-set";

export class Deck {
  id?: number;
  name: string;
  identity: ColorIdentity;
  raw: string;
  tags?: string[];
  notes?: string;
  cards: Map<string, number>;

  constructor(init: {
    name: string;
    identity: ColorIdentity;
    raw: string;
    id?: number;
    tags?: string[];
    notes?: string;
  }) {
    this.name = init.name;
    this.identity = init.identity;
    this.raw = init.raw;
    this.id = init.id;
    this.tags = init.tags;
    this.notes = init.notes;

    this.cards = this.raw?.trim() ? parseRaw(this.raw) : new Map();
  }

  updateRaw(raw: string) {
    this.raw = raw;
    this.cards = parseRaw(raw);
  }

  validate(set: ScryfallSet): {
    valid: boolean;
    errors: string[];
    parsed: Map<string, number>;
  } {
    return validateDeck(this.raw, set);
  }

  isValid(set: ScryfallSet): boolean {
    return this.validate(set).valid;
  }

  toJSON() {
    const { cards, ...rest } = this;
    return rest;
  }
}

export function parseDeck(raw: any): Deck {
  const identity: ColorIdentity = {
    primary: mapColorKeyToValue(raw.identity.primary),
    colors: raw.identity.colors.map((k: string) => mapColorKeyToValue(k)),
  };

  return new Deck({
    id: raw.id,
    name: raw.name,
    identity,
    raw: raw.raw,
    tags: raw.tags ? Array.from(raw.tags) : undefined,
    notes: raw.notes,
  });
}

export function parseRaw(input: string): Map<string, number> {
  const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
  const cardMap = new Map<string, number>();
  const regex = /^(\d+)\s+(.+?)\s+\(([A-Z0-9]+)\)\s+(\d+)$/;

  for (const line of lines) {
    const match = regex.exec(line);
    if (!match) continue;

    const [_, qtyStr, name] = match;
    const quantity = parseInt(qtyStr, 10);

    const current = cardMap.get(name) || 0;
    cardMap.set(name, current + quantity);
  }

  return cardMap;
}

export function validateDeck(raw: string, set: ScryfallSet): {
  valid: boolean;
  errors: string[];
  parsed: Map<string, number>;
} {
  const errors: string[] = [];
  const parsed = parseRaw(raw);

  const totalCards = Array.from(parsed.values()).reduce((sum, qty) => sum + qty, 0);

  if (totalCards === 0) {
    errors.push('No valid deck lines were found.');
  } else if (totalCards !== 60) {
    errors.push(`Deck must contain exactly 60 cards, but has ${totalCards}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    parsed
  };
}

