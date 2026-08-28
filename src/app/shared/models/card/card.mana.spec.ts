import { cmcBucket, compareByCmcThenName, getCmc, manaPipAsset, parseManaPips } from './card.mana';

describe('card mana helpers', () => {
  it('parses pips and CMC from a Scryfall cost', () => {
    expect(parseManaPips('{1}{U}{R}')).toEqual(['1', 'U', 'R']);
    expect(getCmc('{1}{U}{R}')).toBe(3);
    expect(getCmc('{X}{G}')).toBe(1);
    expect(manaPipAsset('U')).toBe('assets/colors/blue.png');
    expect(manaPipAsset('2')).toBeNull();
  });

  it('sorts by CMC then name', () => {
    const names = [
      { name: 'Bolt', manaCost: '{R}' },
      { name: 'Ancestral', manaCost: '{U}' },
      { name: 'Wrath', manaCost: '{2}{W}{W}' }
    ].sort(compareByCmcThenName).map((card) => card.name);
    expect(names).toEqual(['Ancestral', 'Bolt', 'Wrath']);
  });

  it('buckets Arena-style 1- through 6+', () => {
    expect(cmcBucket(0)).toBe('1-');
    expect(cmcBucket(1)).toBe('1-');
    expect(cmcBucket(2)).toBe('2');
    expect(cmcBucket(6)).toBe('6+');
  });
});
