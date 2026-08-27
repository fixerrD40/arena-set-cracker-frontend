import { ScryfallCard } from '../../../core/services/api/scryfall/models/card.scryfall';
import { mapScryfallToCard } from './card.mappers';

describe('mapScryfallToCard', () => {
  it('copies oracle_text from a single-faced card', () => {
    const apiCard = new ScryfallCard({
      id: 'scry-dawn',
      name: 'Dawn of a New Age',
      oracle_text: 'Scry 1. You gain 1 life.'
    });

    expect(mapScryfallToCard(apiCard, 'set-ltr').oracleText).toBe(
      'Scry 1. You gain 1 life.'
    );
  });

  it('joins face oracle_text when the card has no top-level oracle_text', () => {
    const apiCard = new ScryfallCard({
      id: 'scry-mdfc',
      name: 'Front // Back',
      card_faces: [
        { name: 'Front', oracle_text: 'Draw a card.' },
        { name: 'Back', oracle_text: 'Create a token.' }
      ]
    });

    expect(mapScryfallToCard(apiCard, 'set-ltr').oracleText).toBe(
      'Draw a card.\nCreate a token.'
    );
  });

  it('uses empty oracle text when Scryfall omitted it', () => {
    const apiCard = new ScryfallCard({
      id: 'scry-land',
      name: 'Swamp'
    });

    expect(mapScryfallToCard(apiCard, 'set-ltr').oracleText).toBe('');
  });
});
