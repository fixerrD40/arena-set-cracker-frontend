import { Injectable, signal } from '@angular/core';
import { MtgCard } from '../../shared/models/card/card';

export type DeckDropZone = 'cover' | 'library' | 'list' | null;

export interface DeckDragPayload {
  card: MtgCard;
  source: 'collection' | 'contents';
}

const CLICK_DRAG_PX = 8;

@Injectable()
export class DeckBuilderDrag {
  readonly zone = signal<DeckDropZone>(null);

  hover(event: MouseEvent | TouchEvent): void {
    const { x, y } = clientPoint(event);
    const hit = document.elementFromPoint(x, y);
    const raw = hit?.closest('[data-deck-drop]')?.getAttribute('data-deck-drop');
    this.zone.set(raw === 'cover' || raw === 'library' || raw === 'list' ? raw : null);
  }

  clear(): void {
    this.zone.set(null);
  }
}

export function isDragGesture(distance: { x: number; y: number }): boolean {
  return Math.hypot(distance.x, distance.y) >= CLICK_DRAG_PX;
}

function clientPoint(event: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('clientX' in event) {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = event.touches[0] || event.changedTouches[0];
  return { x: touch.clientX, y: touch.clientY };
}
