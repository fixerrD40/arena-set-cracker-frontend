import { MtgCard } from '../card/card';
import { cardArtUri } from '../card/card.art';

type ArtCard = Pick<MtgCard, 'id' | 'localArtUri' | 'localIllustrationUri'>;

/** Chosen cover crop, else the first assigned card that has art. */
export function deckCoverArtUri(
  coverCardId: string,
  catalog: readonly ArtCard[],
  assigned: readonly ArtCard[]
): string {
  if (coverCardId) {
    const chosen = catalog.find((card) => String(card.id) === String(coverCardId));
    if (chosen) {
      return cardArtUri(chosen, 'illustration');
    }
  }

  return assigned.map((card) => cardArtUri(card, 'illustration')).find(Boolean) ?? '';
}
