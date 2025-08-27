export interface ScryfallCard {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  type_line: string;
  mana_cost?: string;
  oracle_text?: string;
  colors?: string[];
  image_uris?: ImageUris;
}

export interface ImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}