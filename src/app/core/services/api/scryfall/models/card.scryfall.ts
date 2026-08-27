export interface ScryfallImageUris {
  normal: string;
  small?: string;
  large?: string;
}

export interface ScryfallCardFace {
  name: string;
  type_line?: string;
  colors?: string[];
  oracle_text?: string;
  image_uris?: ScryfallImageUris;
}

export class ScryfallCard {
  id!: string;
  name!: string;
  arena_id?: number;
  type_line?: string;
  rarity?: string;
  mana_cost?: string;
  oracle_text?: string;
  colors?: string[];
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];

  constructor(init?: Partial<ScryfallCard>) {
    if (init) {
      Object.assign(this, init);
    }
  }

  /**
   * Computed Helper: Safely extracts normal artwork across single-faced
   * or multi-faced/modal double-faced cards (MDFCs)
   */
  get normalArtworkUrl(): string {
    return this.image_uris?.normal
      || this.card_faces?.[0]?.image_uris?.normal
      || '';
  }
}
