// src/app/shared/models/set/set.ts
import { ScryfallSet } from '../../core/services/scryfall/models/set.scryfall';
import { SetEntity } from '../../core/sqlite/sqlite.schema';

export class MtgSet {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string
  ) {}

  /**
   * Computed property ensuring consistent business format
   */
  get normalizedCode(): string {
    return this.code.toLowerCase();
  }

  // ==========================================
  // SQLITE PERSISTENCE MAPPINGS
  // ==========================================

  /** Instantiates a pristine domain model from a local Drizzle SQLite row */
  static fromSqlite(entity: SetEntity): MtgSet {
    return new MtgSet(entity.id, entity.code, entity.name);
  }

  /** Flattens this domain set back into a Drizzle-safe row layout */
  toSqlite(): SetEntity {
    return {
      id: this.id,
      code: this.code.toUpperCase(), // Ensure upper case database normalization
      name: this.name,
      createdAt: new Date().toISOString()
    };
  }

  // ==========================================
  // SCRYFALL WEB API MAPPINGS
  // ==========================================

  /** Instantiates a fresh domain set directly from a raw Scryfall API payload */
  static fromScryfall(api: ScryfallSet): MtgSet {
    return new MtgSet(
      api.id,
      api.code,
      api.name
    );
  }
}
