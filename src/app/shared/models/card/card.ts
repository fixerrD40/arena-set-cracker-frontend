/**
 * Pure, decoupled application UI domain model.
 */
export interface MtgCard {
  id: string;
  setId: string;
  arenaId: number;
  scryfallId: string;
  name: string;
  localArtUri: string;
  typeLine: string;
  colors: string[];
  rarity: string;
  manaCost: string;
}
