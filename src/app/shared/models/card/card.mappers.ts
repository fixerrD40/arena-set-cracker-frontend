import { CardRow, CardInsert } from '../../../core/sqlite/sqlite.schema';
import { MtgCard } from './card';
import { ScryfallCard } from '../../../core/services/api/scryfall/models/card.scryfall';

export function mapRowToCard(row: CardRow): MtgCard {
  return {
    id: row.id,
    setId: row.setId,
    arenaId: row.arenaId,
    collectorNumber: row.collectorNumber,
    scryfallId: row.scryfallId,
    name: row.name,
    localArtUri: row.localArtUri,
    localIllustrationUri: row.localIllustrationUri || '',
    typeLine: row.typeLine,
    colors: row.colors,
    rarity: row.rarity,
    manaCost: row.manaCost,
    oracleText: row.oracleText || ''
  };
}

export function mapCardToInsert(card: MtgCard): CardInsert {
  return {
    id: card.id,
    setId: card.setId,
    arenaId: card.arenaId,
    collectorNumber: card.collectorNumber,
    scryfallId: card.scryfallId,
    name: card.name,
    localArtUri: card.localArtUri,
    localIllustrationUri: card.localIllustrationUri || '',
    typeLine: card.typeLine,
    colors: card.colors,
    rarity: card.rarity,
    manaCost: card.manaCost,
    oracleText: card.oracleText || ''
  };
}

export function mapScryfallToCard(
  apiCard: ScryfallCard,
  generatedSetId: string,
  localArtUri: string = '',
  localIllustrationUri: string = ''
): MtgCard {
  return {
    id: apiCard.id,
    setId: generatedSetId,
    arenaId: apiCard.arena_id ?? 0,
    collectorNumber: apiCard.collector_number ?? '',
    scryfallId: apiCard.id,
    name: apiCard.name,
    localArtUri: localArtUri,
    localIllustrationUri: localIllustrationUri,
    typeLine: apiCard.type_line || 'Unknown',
    colors: apiCard.colors || [],
    rarity: apiCard.rarity || 'common',
    manaCost: apiCard.mana_cost || '{0}',
    oracleText: scryfallOracleText(apiCard)
  };
}

function scryfallOracleText(apiCard: ScryfallCard): string {
  if (apiCard.oracle_text) {
    return apiCard.oracle_text;
  }
  const faces = apiCard.card_faces || [];
  return faces
    .map((face) => face.oracle_text || '')
    .filter((text) => text.length > 0)
    .join('\n');
}
