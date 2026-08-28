import { ScryfallCard } from './card.scryfall';

describe('ScryfallCard artwork URLs', () => {
  it('reads normal and art_crop from top-level image_uris', () => {
    const card = new ScryfallCard({
      image_uris: { normal: 'n.png', art_crop: 'c.jpg' }
    });

    expect(card.normalArtworkUrl).toBe('n.png');
    expect(card.illustrationArtworkUrl).toBe('c.jpg');
  });

  it('reads from the first face when the card has no top-level image_uris', () => {
    const card = new ScryfallCard({
      card_faces: [{ name: 'Front', image_uris: { normal: 'n.png', art_crop: 'c.jpg' } }]
    });

    expect(card.normalArtworkUrl).toBe('n.png');
    expect(card.illustrationArtworkUrl).toBe('c.jpg');
  });

  it('returns empty illustration URL when art_crop is omitted', () => {
    const card = new ScryfallCard({
      image_uris: { normal: 'n.png' }
    });

    expect(card.illustrationArtworkUrl).toBe('');
  });
});
