import { MtgDeck } from './deck';
import { ScryfallSet } from '../../core/services/scryfall/models/set.scryfall';

describe('Deck Domain Engine', () => {
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

  const testSet = new ScryfallSet({
    id: 'set-uuid-1234',
    code: 'LTR',
    name: 'The Lord of the Rings: Tales of Middle-earth',
    digital: false
  });

  // A raw text string representing malformed data that will trigger your validation errors
  const badRaw = `
Deck
1 Dawn of a New Age (LTR) 5
9 Swamp (LTR) 266
10 Plains (LTR) 263
`;

  describe('parseRaw Text Tokenizer', () => {
    it('parses valid card lines from raw deck text', () => {
      // Accessing your real model logic directly!
      const parsed = MtgDeck.parseRaw(exampleRaw);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  describe('validateDeck Constraints Engine', () => {
    it('rejects a deck with wrong card count', () => {
      // Testing the static business logic directly
      const result = MtgDeck.validateDeck(badRaw, testSet);
      expect(result.valid).toBeFalse();
    });
  });

  describe('Deck Constructor Layer', () => {
    it('throws on invalid raw input', () => {
      expect(() => {
        // Triggers the inner factory check loop
        MtgDeck.fromArenaExport({ id: '1', name: 'Broken' }, 'bad text', testSet);
      }).toThrowError(/no valid deck lines/i);
    });
  });
});
