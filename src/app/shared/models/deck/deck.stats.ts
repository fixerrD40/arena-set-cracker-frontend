import { MtgCard } from '../card/card';
import { ManaColor, collectionColors, isLandCard } from '../card/arena-collection.filter';
import { CMC_BUCKETS, CmcBucket, cmcBucket, getCmc, parseManaPips } from '../card/card.mana';

export interface QuantifiedCard {
  card: MtgCard;
  quantity: number;
}

const PRIMARY_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Planeswalker',
  'Battle',
  'Land'
] as const;

export interface DeckSubtypeCount {
  name: string;
  count: number;
}

export interface DeckTypeBucket {
  type: string;
  count: number;
  subtypes: DeckSubtypeCount[];
}

export interface DeckCurveBucket {
  bucket: CmcBucket;
  creatures: number;
  nonCreatures: number;
}

export interface DeckSummary {
  totalCopies: number;
  creatureCopies: number;
  nonCreatureCopies: number;
  landCopies: number;
  averageCmc: number;
  curve: DeckCurveBucket[];
  types: DeckTypeBucket[];
}

export type DeckRowTone = 'w' | 'u' | 'b' | 'r' | 'g' | 'dual' | 'multi' | 'colorless';

const ROW_EDGE: Record<ManaColor, string> = {
  W: '#e4e0d8',
  U: '#3a7ec8',
  B: '#6a6570',
  R: '#c44a32',
  G: '#3d8a42'
};

export function deckRowTone(card: MtgCard): DeckRowTone {
  const colors = collectionColors(card);
  if (colors.length >= 3) return 'multi';
  if (colors.length === 2) return 'dual';
  if (colors.length === 1) return colors[0].toLowerCase() as Exclude<DeckRowTone, 'dual' | 'multi' | 'colorless'>;
  return 'colorless';
}

/** Two-color outer rim (vertical), unused for every other row. */
export function deckRowToneStyle(card: MtgCard): Record<string, string> {
  const colors = collectionColors(card);
  if (colors.length !== 2) return {};
  return {
    '--tone-a': ROW_EDGE[colors[0]],
    '--tone-b': ROW_EDGE[colors[1]]
  };
}

/** Printed cost only. Lands with no cost show no pips. */
export function deckRowManaPips(card: MtgCard): string[] {
  const pips = parseManaPips(card.manaCost);
  if (isLandCard(card) && (pips.length === 0 || (pips.length === 1 && pips[0] === '0'))) {
    return [];
  }
  return pips;
}

export function summarizeDeck(lines: QuantifiedCard[]): DeckSummary {
  const curveMap = new Map<CmcBucket, { creatures: number; nonCreatures: number }>();
  for (const bucket of CMC_BUCKETS) {
    curveMap.set(bucket, { creatures: 0, nonCreatures: 0 });
  }

  const typeCopies = new Map<string, number>();
  const subtypeCopies = new Map<string, Map<string, number>>();

  let totalCopies = 0;
  let creatureCopies = 0;
  let landCopies = 0;
  let cmcWeighted = 0;
  let cmcCards = 0;

  for (const line of lines) {
    const qty = line.quantity;
    if (qty <= 0) continue;

    totalCopies += qty;
    const land = isLandCard(line.card);
    const creature = /\bCreature\b/.test(line.card.typeLine);

    if (land) landCopies += qty;
    else if (creature) creatureCopies += qty;

    if (!land) {
      cmcWeighted += getCmc(line.card.manaCost) * qty;
      cmcCards += qty;
      const bucket = cmcBucket(getCmc(line.card.manaCost));
      const slot = curveMap.get(bucket)!;
      if (creature) slot.creatures += qty;
      else slot.nonCreatures += qty;
    }

    for (const type of primaryTypesOn(line.card.typeLine)) {
      typeCopies.set(type, (typeCopies.get(type) || 0) + qty);
      if (type === 'Land' || type === 'Creature' || type === 'Enchantment') {
        const subtypes = subtypesOn(line.card.typeLine);
        if (!subtypeCopies.has(type)) subtypeCopies.set(type, new Map());
        const bag = subtypeCopies.get(type)!;
        for (const sub of subtypes) {
          bag.set(sub, (bag.get(sub) || 0) + qty);
        }
      }
    }
  }

  const types: DeckTypeBucket[] = PRIMARY_TYPES
    .filter((type) => (typeCopies.get(type) || 0) > 0)
    .map((type) => ({
      type,
      count: typeCopies.get(type) || 0,
      subtypes: [...(subtypeCopies.get(type)?.entries() ?? [])]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }));

  return {
    totalCopies,
    creatureCopies,
    nonCreatureCopies: totalCopies - creatureCopies - landCopies,
    landCopies,
    averageCmc: cmcCards ? Math.round((cmcWeighted / cmcCards) * 10) / 10 : 0,
    curve: CMC_BUCKETS.map((bucket) => ({
      bucket,
      ...curveMap.get(bucket)!
    })),
    types
  };
}

function primaryTypesOn(typeLine: string): string[] {
  return PRIMARY_TYPES.filter((type) => new RegExp(`\\b${type}\\b`).test(typeLine));
}

function subtypesOn(typeLine: string): string[] {
  const dash = typeLine.split(/\s[—–-]\s/);
  if (dash.length < 2) return [];
  return dash[1]
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function curvePeak(curve: { creatures: number; nonCreatures: number }[]): number {
  return Math.max(1, ...curve.map((bucket) => bucket.creatures + bucket.nonCreatures));
}

export function curveBarHeight(count: number, peak: number, maxPx = 48): number {
  if (peak <= 0 || count <= 0) return 0;
  return Math.max(2, Math.round((count / peak) * maxPx));
}
