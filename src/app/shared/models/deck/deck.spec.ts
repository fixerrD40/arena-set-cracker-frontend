// src/app/shared/models/deck/deck.utils.spec.ts
import { parseArenaTextToDeckMap } from './deck.utils';

describe('Deck Domain Engine (Pure Functional)', () => {
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

  const badRaw = `
Deck
Malformed Line Without Brackets Or Numbers
Another Stray Text Line 1234
`;

  describe('parseArenaTextToDeckMap Clipboard Parser', () => {

    it('successfully translates valid card lines into a structured Map', () => {
      const cardMap = parseArenaTextToDeckMap(exampleRaw);
      expect(cardMap.size).toBe(22);
      expect(cardMap.get('5')).toBe(1);
      expect(cardMap.get('266')).toBe(9);
      expect(cardMap.get('263')).toBe(10);
      expect(cardMap.get('78')).toBe(2);
    });

    it('returns an empty Map container when handed a blank or empty string', () => {
      const cardMap = parseArenaTextToDeckMap('');
      expect(cardMap.size).toBe(0);
    });

    it('safely skips malformed text structures without crashing the loop thread', () => {
      const cardMap = parseArenaTextToDeckMap(badRaw);
      expect(cardMap.size).toBe(0);
    });

    it('correctly aggregates quantities if duplicate card lines exist in text', () => {
      const duplicateLinesRaw = `
        1 Dawn of a New Age (LTR) 5
        3 Dawn of a New Age (LTR) 5
      `;
      const cardMap = parseArenaTextToDeckMap(duplicateLinesRaw);
      expect(cardMap.get('5')).toBe(4);
    });
  });
});
