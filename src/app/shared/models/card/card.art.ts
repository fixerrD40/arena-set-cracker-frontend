import { MtgCard } from './card';

export type CardArtKind = 'frame' | 'illustration';

/** Framed card for the collection; illustration crop for thumbs and chrome. */
export function cardArtUri(card: Pick<MtgCard, 'localArtUri' | 'localIllustrationUri'>, kind: CardArtKind): string {
  if (kind === 'illustration' && card.localIllustrationUri) {
    return card.localIllustrationUri;
  }
  return card.localArtUri;
}
