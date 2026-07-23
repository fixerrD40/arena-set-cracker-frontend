// src/app/shared/models/card/card.ts

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

/**
 * Over-the-wire JSON REST endpoint contract.
 */
export interface CloudCardPayload {
  id: string;
  setId: string;
  arenaId: number;
  scryfallId: string;
  name: string;
  localArtUri?: string;
  typeLine?: string;
  colors?: string[];
  rarity: string;
  manaCost: string;
}
