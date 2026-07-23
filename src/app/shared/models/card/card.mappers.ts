// src/app/shared/models/card/card.mappers.ts
import { CardRow, CardInsert } from '../../../core/storage/sqlite/sqlite.schema';
import { MtgCard, CloudCardPayload } from './card';
import { ScryfallCard } from '../../../core/services/api/scryfall/models/card.scryfall';

/**
 * DATABASE INPUT WIRE:
 * Translates a raw SQLite row read from disk into your pure application domain structure.
 */
export function mapRowToCard(row: CardRow): MtgCard {
  return {
    id: row.id,
    setId: row.setId,
    arenaId: row.arenaId,
    scryfallId: row.scryfallId,
    name: row.name,
    localArtUri: row.localArtUri,
    typeLine: row.typeLine,
    colors: row.colors, // Drizzle mode: 'json' automatically parses this column into a string[]
    rarity: row.rarity,
    manaCost: row.manaCost
  };
}

/**
 * DATABASE OUTPUT WIRE:
 * Serializes your core domain card model into the flat schema layout your Drizzle database write layer requires.
 */
export function mapCardToInsert(card: MtgCard): CardInsert {
  return {
    id: card.id,
    setId: card.setId,
    arenaId: card.arenaId,
    scryfallId: card.scryfallId,
    name: card.name,
    localArtUri: card.localArtUri,
    typeLine: card.typeLine,
    colors: card.colors, // Drizzle mode: 'json' stringifies this array automatically on write
    rarity: card.rarity,
    manaCost: card.manaCost
  };
}

/**
 * NETWORK INPUT WIRE (SCRYFALL REST API):
 * Translates a raw incoming card chunk payload from Scryfall directly into your pure application domain structure.
 */
export function mapScryfallToCard(
  apiCard: ScryfallCard,
  generatedSetId: string,
  localArtUri: string = ''
): MtgCard {
  return {
    id: apiCard.id,
    setId: generatedSetId,
    arenaId: apiCard.arena_id ?? 0,
    scryfallId: apiCard.id,
    name: apiCard.name,
    localArtUri: localArtUri,
    typeLine: apiCard.type_line || 'Unknown',
    colors: apiCard.colors || [],
    rarity: apiCard.rarity || 'common',
    manaCost: apiCard.mana_cost || '{0}'
  };
}

/**
 * NETWORK INPUT WIRE (STANDARD CLOUD API):
 * Translates a raw over-the-wire database JSON footprint back into your domain model structure.
 */
export function mapJsonToCard(payload: CloudCardPayload): MtgCard {
  return {
    id: payload.id,
    setId: payload.setId,
    arenaId: payload.arenaId,
    scryfallId: payload.scryfallId,
    name: payload.name || 'Unknown Card',
    localArtUri: payload.localArtUri || '',
    typeLine: payload.typeLine || 'Unknown',
    colors: payload.colors || [],
    rarity: payload.rarity || 'common',
    manaCost: payload.manaCost || '{0}'
  };
}

/**
 * NETWORK OUTPUT WIRE:
 * Serializes your UI model into a clean JSON literal dictionary for standard REST API endpoints.
 */
export function mapCardToJson(card: MtgCard): CloudCardPayload {
  return {
    id: card.id,
    setId: card.setId,
    arenaId: card.arenaId,
    scryfallId: card.scryfallId,
    name: card.name,
    localArtUri: card.localArtUri,
    typeLine: card.typeLine,
    colors: card.colors,
    rarity: card.rarity,
    manaCost: card.manaCost
  };
}
