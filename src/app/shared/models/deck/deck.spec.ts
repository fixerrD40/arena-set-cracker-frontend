// src/app/shared/models/deck/deck.utils.spec.ts
import { describe, it } from 'node:test';
import assert from 'node:assert'; // Native Node assertion engine
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

  // A raw text string representing an empty or unrecognizable deck footprint
  const badRaw = `
Deck
Malformed Line Without Brackets Or Numbers
Another Stray Text Line 1234
`;

  describe('parseArenaTextToDeckMap Clipboard Parser', () => {

    it('successfully translates valid card lines into a structured Map', () => {
      // 🌟 TEST THE UTILITY DIRECTLY: Takes text, yields a pure Map dictionary [INDEX]
      const cardMap = parseArenaTextToDeckMap(exampleRaw);

      // Verify the parser successfully extracted items [INDEX]
      assert.strictEqual(cardMap.size, 22);

      // Verify explicit card allocation weights match your string parameters [INDEX]
      assert.strictEqual(cardMap.get('5'), 1);   // 1 Dawn of a New Age
      assert.strictEqual(cardMap.get('266'), 9); // 9 Swamp
      assert.strictEqual(cardMap.get('263'), 10); // 10 Plains
      assert.strictEqual(cardMap.get('78'), 2);  // 2 The Black Breath
    });

    it('returns an empty Map container when handed a blank or empty string', () => {
      const cardMap = parseArenaTextToDeckMap('');
      assert.strictEqual(cardMap.size, 0);
    });

    it('safely skips malformed text structures without crashing the loop thread', () => {
      const cardMap = parseArenaTextToDeckMap(badRaw);

      // Because no lines matched the MTG Arena export regex token, map remains empty [INDEX]
      assert.strictEqual(cardMap.size, 0);
    });

    it('correctly aggregates quantities if duplicate card lines exist in text', () => {
      const duplicateLinesRaw = `
        1 Dawn of a New Age (LTR) 5
        3 Dawn of a New Age (LTR) 5
      `;

      const cardMap = parseArenaTextToDeckMap(duplicateLinesRaw);

      // 🌟 ACCUMULATION CHECK: Quantities should sum up to 4 rather than getting overridden! [INDEX]
      assert.strictEqual(cardMap.get('5'), 4);
    });
  });
});
