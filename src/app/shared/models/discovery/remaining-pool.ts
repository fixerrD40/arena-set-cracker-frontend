import { MtgCard } from '../card/card';
import { ManaColor, matchesColorScope } from '../card/arena-collection.filter';
import { MtgDeck, DeckStatus } from '../deck/deck';

export interface RemainingPoolOptions {
  /** Default: final only. When true, needs-work decks also drain. */
  drainNeedsWork?: boolean;
  /** Session color scope; empty = all colors. */
  colors?: readonly ManaColor[];
}

const DEFAULT_DRAIN: DeckStatus[] = ['final'];

export function drainingStatuses(drainNeedsWork: boolean): DeckStatus[] {
  return drainNeedsWork ? ['final', 'needs-work'] : DEFAULT_DRAIN;
}

export function claimedCardIds(decks: readonly MtgDeck[], drainNeedsWork: boolean): Set<string> {
  const statuses = new Set(drainingStatuses(drainNeedsWork));
  const claimed = new Set<string>();

  for (const deck of decks) {
    if (!statuses.has(deck.status)) {
      continue;
    }
    for (const cardId of deck.cards.keys()) {
      if ((deck.cards.get(cardId) ?? 0) > 0) {
        claimed.add(String(cardId));
      }
    }
  }

  return claimed;
}

export function remainingPoolCards(
  catalog: readonly MtgCard[],
  decks: readonly MtgDeck[],
  options: RemainingPoolOptions = {}
): MtgCard[] {
  const claimed = claimedCardIds(decks, options.drainNeedsWork ?? false);
  let pool = catalog.filter((card) => !claimed.has(String(card.id)));

  const colors = options.colors ?? [];
  if (colors.length > 0) {
    pool = pool.filter((card) => matchesColorScope(card, colors));
  }

  return pool;
}

/** Stable identity for discovery caching — deck theme/name edits do not affect the pool. */
export function remainingPoolSignature(pool: readonly MtgCard[]): string {
  if (pool.length === 0) {
    return '';
  }
  return pool
    .map((card) => String(card.id))
    .sort()
    .join('\0');
}

export function remainingPoolCounts(
  catalog: readonly MtgCard[],
  decks: readonly MtgDeck[],
  options: RemainingPoolOptions = {}
): { remaining: number; total: number; scoped: number } {
  const claimed = claimedCardIds(decks, options.drainNeedsWork ?? false);
  const total = catalog.length;
  const remaining = catalog.filter((card) => !claimed.has(String(card.id))).length;
  const scoped = remainingPoolCards(catalog, decks, options).length;
  return { remaining, total, scoped };
}
