import { MtgCard } from '../card/card';
import { QuantifiedCard, deckRowManaPips, deckRowTone, deckRowToneStyle, summarizeDeck } from './deck.stats';

function card(partial: Partial<MtgCard> & Pick<MtgCard, 'name' | 'typeLine' | 'colors'>): MtgCard {
  return {
    id: partial.id ?? partial.name,
    setId: 'set-ltr',
    arenaId: 0,
    scryfallId: partial.name,
    localArtUri: '',
    localIllustrationUri: '',
    rarity: 'common',
    manaCost: '{1}{U}',
    oracleText: '',
    ...partial
  };
}

function line(partial: Partial<MtgCard> & Pick<MtgCard, 'name' | 'typeLine' | 'colors'>, quantity: number): QuantifiedCard {
  return { card: card(partial), quantity };
}

describe('summarizeDeck', () => {
  it('splits creatures, non-creatures, and lands and averages non-land CMC', () => {
    const summary = summarizeDeck([
      line({ name: 'Elf', typeLine: 'Creature — Elf', colors: ['G'], manaCost: '{G}' }, 2),
      line({ name: 'Bolt', typeLine: 'Instant', colors: ['R'], manaCost: '{R}' }, 3),
      line({ name: 'Swamp', typeLine: 'Basic Land — Swamp', colors: [], manaCost: '' }, 4)
    ]);

    expect(summary.totalCopies).toBe(9);
    expect(summary.creatureCopies).toBe(2);
    expect(summary.nonCreatureCopies).toBe(3);
    expect(summary.landCopies).toBe(4);
    expect(summary.averageCmc).toBe(1);
    expect(summary.types.map((t) => t.type)).toEqual(['Creature', 'Instant', 'Land']);
  });
});

describe('deckRowTone', () => {
  it('uses a dual rim for two colors and gold for three-plus', () => {
    expect(deckRowTone(card({ name: 'Bolt', typeLine: 'Instant', colors: ['R'] }))).toBe('r');
    expect(deckRowTone(card({ name: 'Plains', typeLine: 'Basic Land — Plains', colors: [] }))).toBe('w');
    expect(deckRowTone(card({ name: 'Swamp', typeLine: 'Basic Land — Swamp', colors: [] }))).toBe('b');
    expect(deckRowTone(card({ name: 'Charm', typeLine: 'Instant', colors: ['U', 'R'] }))).toBe('dual');
    expect(deckRowTone(card({ name: 'Jeskai Charm', typeLine: 'Instant', colors: ['U', 'R', 'W'] }))).toBe('multi');
    expect(deckRowToneStyle(card({ name: 'Charm', typeLine: 'Instant', colors: ['U', 'R'] }))).toEqual({
      '--tone-a': '#3a7ec8',
      '--tone-b': '#c44a32'
    });
    expect(deckRowManaPips(card({ name: 'Bolt', typeLine: 'Instant', colors: ['R'], manaCost: '{R}' }))).toEqual(['R']);
    expect(deckRowManaPips(card({ name: 'Plains', typeLine: 'Basic Land — Plains', colors: [], manaCost: '{0}' }))).toEqual([]);
    expect(deckRowManaPips(card({
      name: 'Dryad Arbor',
      typeLine: 'Land Creature — Forest Dryad',
      colors: ['G'],
      manaCost: '{G}'
    }))).toEqual(['G']);
  });
});
