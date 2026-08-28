import { deckCoverArtUri } from './deck.cover';

describe('deckCoverArtUri', () => {
  const bolt = { id: 'bolt', localArtUri: 'bolt.png', localIllustrationUri: 'bolt-art.jpg' };
  const swamp = { id: 'swamp', localArtUri: 'swamp.png', localIllustrationUri: '' };

  it('uses the chosen catalog card even when it is not first in the assigned list', () => {
    expect(deckCoverArtUri('swamp', [bolt, swamp], [bolt, swamp])).toBe('swamp.png');
  });

  it('falls back to the first assigned card with art when no cover is chosen', () => {
    expect(deckCoverArtUri('', [bolt, swamp], [bolt, swamp])).toBe('bolt-art.jpg');
  });

  it('falls back when the chosen id is missing from the catalog', () => {
    expect(deckCoverArtUri('gone', [bolt], [bolt])).toBe('bolt-art.jpg');
  });
});
