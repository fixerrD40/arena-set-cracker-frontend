import { MtgCard } from '../card/card';
import { COLLECTION_RARITIES, CollectionRarity } from '../card/arena-collection.filter';
import { MtgDeck } from '../deck/deck';

export interface RarityBreakdown {
  common: number;
  uncommon: number;
  rare: number;
  mythic: number;
}

export interface SetAssignmentMetrics {
  uniqueCardsUsed: number;
  totalCatalog: number;
  uniqueCardsUsedPct: number;
  totalCopiesAssigned: number;
  /** Total copies assigned, summed by card rarity across all decks. */
  copiesByRarity: RarityBreakdown;
  /** Distinct catalog cards assigned, counted by rarity. */
  uniqueByRarity: RarityBreakdown;
}

export function computeSetAssignmentMetrics(
  catalog: readonly MtgCard[],
  decks: readonly MtgDeck[]
): SetAssignmentMetrics {
  const catalogById = new Map(catalog.map((card) => [String(card.id), card]));
  const usedIds = new Set<string>();
  const copiesByRarity = emptyRarityBreakdown();
  const uniqueByRarity = emptyRarityBreakdown();
  let totalCopiesAssigned = 0;

  for (const deck of decks) {
    deck.cards.forEach((qty, cardId) => {
      if (qty <= 0) {
        return;
      }
      const card = catalogById.get(String(cardId));
      if (!card) {
        return;
      }

      totalCopiesAssigned += qty;

      const id = String(cardId);
      const rarity = normalizeRarity(card.rarity);
      copiesByRarity[rarity] += qty;

      if (!usedIds.has(id)) {
        usedIds.add(id);
        uniqueByRarity[rarity]++;
      }
    });
  }

  const totalCatalog = catalog.length;
  const uniqueCardsUsed = usedIds.size;

  return {
    uniqueCardsUsed,
    totalCatalog,
    uniqueCardsUsedPct: totalCatalog ? Math.round((uniqueCardsUsed / totalCatalog) * 1000) / 10 : 0,
    totalCopiesAssigned,
    copiesByRarity,
    uniqueByRarity
  };
}

function emptyRarityBreakdown(): RarityBreakdown {
  return { common: 0, uncommon: 0, rare: 0, mythic: 0 };
}

function normalizeRarity(value: string): CollectionRarity {
  return COLLECTION_RARITIES.includes(value as CollectionRarity) ? (value as CollectionRarity) : 'common';
}
