import { Deck } from './deck';
import { parseRaw, validateDeck } from './deck';
import { ScryfallSet } from '../models/scryfall-set';

describe('Deck', () => {
  const exampleRaw = `
Deck
1 Dawn of a New Age (LTR) 5
9 Swamp (LTR) 266
10 Plains (LTR) 263
3 Easterling Vanguard (LTR) 83
3 Soldier of the Grey Host (LTR) 32
1 Minas Tirith (LTR) 256
3 Shadow Summoning (LTR) 226
3 Esquire of the King (LTR) 13
2 Forge Anew (LTR) 17
2 Dúnedain Blade (LTR) 6
2 Haunt of the Dead Marshes (LTR) 90
2 King of the Oathbreakers (LTR) 211
1 Andúril, Flame of the West (LTR) 236
2 Oath of the Grey Host (LTR) 101
3 Dunland Crebain (LTR) 82
2 Gothmog, Morgul Lieutenant (LTR) 87
2 Faramir, Field Commander (LTR) 14
2 Denethor, Ruling Steward (LTR) 198
2 Inherited Envelope (LTR) 242
1 Aragorn and Arwen, Wed (LTR) 287
2 Bitter Downfall (LTR) 77
2 The Black Breath (LTR) 78
`;

  const testSet: ScryfallSet = {
    code: 'LTR',
    name: '',
    released_at: '',
    icon_svg_uri: '',
  };

  describe('parseRaw', () => {
    it('parses valid card lines from raw deck text', () => {
      const parsed = parseRaw(exampleRaw);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed.every(card => card.name && card.set)).toBe(true);
    });

    it('ignores the Deck header line', () => {
      const parsed = parseRaw(exampleRaw);
      expect(parsed.some(line => line.raw.startsWith('Deck'))).toBe(false);
    });

    it('correctly parses a known line', () => {
      const parsed = parseRaw(exampleRaw);
      const card = parsed.find(c => c.name.includes('Dawn of a New Age'));
      expect(card).toBeDefined();
      expect(card!.quantity).toBe(1);
      expect(card!.set).toBe('LTR');
      expect(card!.collectorNumber).toBe(5);
    });
  });

  describe('validateDeck', () => {
    it('accepts a correct deck', () => {
      const result = validateDeck(exampleRaw, testSet);
      expect(result.valid).toBeTrue();
      expect(result.errors.length).toBe(0);
    });

    it('rejects a deck with wrong card count', () => {
      const parsed = parseRaw(exampleRaw).slice(0, -1);
      const rawWithMissingCard = parsed.map(c => c.raw).join('\n');
      const result = validateDeck(rawWithMissingCard, testSet);
      expect(result.valid).toBeFalse();
      expect(result.errors).toContain(jasmine.stringMatching(/exactly 60 cards/i));
    });

    it('rejects a deck with mixed sets', () => {
      const parsed = parseRaw(exampleRaw);
      parsed[0].set = 'XYZ';
      const rawMixed = parsed.map(c => `${c.quantity} ${c.name} (${c.set}) ${c.collectorNumber}`).join('\n');
      const result = validateDeck(rawMixed, testSet);
      expect(result.valid).toBeFalse();
      expect(result.errors).toContain(jasmine.stringMatching(/must be from the same set/i));
    });

    it('rejects when parsed set differs from expected set', () => {
      const result = validateDeck(exampleRaw, { ...testSet, code: 'ABC' });
      expect(result.valid).toBeFalse();
      expect(result.errors).toContain(jasmine.stringMatching(/expected "ABC"/i));
    });

    it('returns error if no valid lines found', () => {
      const raw = `This is not a deck`;
      const result = validateDeck(raw, testSet);
      expect(result.valid).toBeFalse();
      expect(result.errors).toContain(jasmine.stringMatching(/no valid deck lines/i));
    });
  });

  describe('Deck class', () => {
    it('constructs a valid deck successfully', () => {
      const deck = new Deck({ name: 'Valid LTR', raw: exampleRaw }, testSet);
      expect(deck.name).toBe('Valid LTR');
      expect(deck.cards.length).toBeGreaterThan(0);
    });

    it('throws on invalid raw input', () => {
      const badRaw = 'not a deck at all';
      expect(() => {
        new Deck({ name: 'Broken Deck', raw: badRaw }, testSet);
      }).toThrowError(/no valid deck lines/i);
    });

    it('throws on mismatched set', () => {
      expect(() => {
        new Deck({ name: 'Wrong Set Deck', raw: exampleRaw }, { code: 'ZZZ', name: '' });
      }).toThrowError(/expected "ZZZ"/i);
    });

    it('throws if card count is incorrect', () => {
      const incomplete = parseRaw(exampleRaw).slice(0, -2).map(c => c.raw).join('\n');
      expect(() => {
        new Deck({ name: 'Short Deck', raw: incomplete }, testSet);
      }).toThrowError(/exactly 60 cards/i);
    });
  });
});