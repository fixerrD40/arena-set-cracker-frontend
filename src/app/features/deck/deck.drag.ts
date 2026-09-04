import { Injectable, signal } from '@angular/core';

import { hitClosest } from '../../shared/drag/drag.utils';
import { MtgCard } from '../../shared/models/card/card';

export type DeckDropZone = 'cover' | 'library' | 'list' | null;

export interface DeckDragPayload {
  card: MtgCard;
  source: 'collection' | 'contents';
}

export { isDragGesture } from '../../shared/drag/drag.utils';

@Injectable()
export class DeckBuilderDrag {
  readonly zone = signal<DeckDropZone>(null);

  hover(event: MouseEvent | TouchEvent): void {
    const raw = hitClosest(event, '[data-deck-drop]')?.getAttribute('data-deck-drop');
    this.zone.set(raw === 'cover' || raw === 'library' || raw === 'list' ? raw : null);
  }

  clear(): void {
    this.zone.set(null);
  }
}
