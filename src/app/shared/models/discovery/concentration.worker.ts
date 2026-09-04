import { concentrate } from './concentration';
import { MtgCard } from '../card/card';
import type { ConcentratedPattern } from './concentration';

interface ConcentrateWorkerRequest {
  id: number;
  cards: MtgCard[];
}

interface ConcentrateWorkerResponse {
  id: number;
  patterns: ConcentratedPattern[];
}

addEventListener('message', (event: MessageEvent<ConcentrateWorkerRequest>) => {
  const { id, cards } = event.data;
  const patterns = concentrate(cards ?? []);
  const response: ConcentrateWorkerResponse = { id, patterns };
  postMessage(response);
});
