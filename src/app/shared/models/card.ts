// src/app/shared/models/card/card.ts
import { ScryfallCard } from '../../core/services/scryfall/models/card.scryfall';
import { CardEntity } from '../../core/sqlite/sqlite.schema';

export class MtgCard {
  constructor(
    public id: string,           // Fixed: UUID String matching text('id').primaryKey()
    public setId: string,        // Fixed: UUID String matching text('set_id').references()
    public arenaId: number,
    public name: string,
    public localArtUri: string,
    public typeLine: string,
    public colors: string[],
    public rarity: string,
    public manaCost: string,
    public scryfallId: string
  ) {}

  // ==========================================
  // SQLITE PERSISTENCE MAPPINGS
  // ==========================================

  static fromSqlite(entity: CardEntity): MtgCard {
    return new MtgCard(
      entity.id,                // String UUID
      entity.setId,             // String UUID
      entity.arenaId,
      entity.name,
      entity.localArtUri,
      entity.typeLine,
      entity.colors,
      entity.rarity ?? 'common',
      entity.manaCost ?? '',
      entity.scryfallId
    );
  }

  toSqlite(): CardEntity {
    return {
      id: this.id,              // String UUID
      setId: this.setId,        // String UUID
      arenaId: this.arenaId,
      scryfallId: this.scryfallId,
      name: this.name,
      localArtUri: this.localArtUri,
      typeLine: this.typeLine,
      colors: this.colors ?? [],
      rarity: this.rarity,
      manaCost: this.manaCost
    };
  }

  // ==========================================
  // SCRYFALL WEB API MAPPINGS
  // ==========================================

  static fromScryfall(api: ScryfallCard, localSetId: string): MtgCard {
    const artUri = api.image_uris?.normal
      || api.card_faces?.[0]?.image_uris?.normal
      || '';

    return new MtgCard(
      api.id,                  // Scryfall's string UUID becomes our main local primary key
      localSetId,              // Parent set's string UUID
      api.arena_id ?? 0,
      api.name,
      artUri,
      api.type_line ?? 'Unknown',
      api.colors ?? [],
      api.rarity ?? 'common',
      api.mana_cost ?? '',
      api.id                   // Duplicate to scryfallId tracking property if needed
    );
  }
}
