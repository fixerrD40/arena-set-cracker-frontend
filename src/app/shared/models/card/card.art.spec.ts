import { cardArtUri } from './card.art';

describe('cardArtUri', () => {
  const card = {
    localArtUri: 'cached_art/ltr/1.png',
    localIllustrationUri: 'cached_art/ltr/1-art.jpg'
  };

  it('returns the framed file for the collection', () => {
    expect(cardArtUri(card, 'frame')).toBe('cached_art/ltr/1.png');
  });

  it('returns the crop when asking for illustration', () => {
    expect(cardArtUri(card, 'illustration')).toBe('cached_art/ltr/1-art.jpg');
  });

  it('falls back to the framed file when the crop is missing', () => {
    expect(cardArtUri({ ...card, localIllustrationUri: '' }, 'illustration')).toBe(
      'cached_art/ltr/1.png'
    );
  });
});
