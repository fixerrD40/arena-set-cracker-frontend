import { Injectable, signal } from '@angular/core';

import { dragClientPoint, hitClosest, isDragGesture } from '../../shared/drag/drag.utils';

const DRAWER_PEEK_PX = 56;

/**
 * Set-board theme-phrase drop attrs (`data-set-drop`):
 * - `deck-theme` — deck row that accepts a pattern from the pool
 * - `theme-pool` — patterns panel that accepts a theme chip returned from a deck
 */
@Injectable()
export class SetBoardDrag {
  readonly themeDropDeckId = signal<string | null>(null);
  readonly themeReturnHot = signal(false);
  readonly pointerDrag = signal(false);
  readonly peekDrawer = signal(false);

  started(): void {
    this.pointerDrag.set(true);
  }

  hoverDeckThemeDrop(event: MouseEvent | TouchEvent): void {
    const row = hitClosest(event, '[data-set-drop="deck-theme"]');
    this.themeDropDeckId.set(row?.getAttribute('data-deck-id') ?? null);
  }

  hoverPatternAttach(event: MouseEvent | TouchEvent, drawerOpen: boolean): void {
    this.hoverDeckThemeDrop(event);
    if (drawerOpen) {
      return;
    }
    const { x } = dragClientPoint(event);
    if (x <= DRAWER_PEEK_PX) {
      this.peekDrawer.set(true);
    }
  }

  hoverThemeReturn(event: MouseEvent | TouchEvent): void {
    this.themeReturnHot.set(!!hitClosest(event, '[data-set-drop="theme-pool"]'));
  }

  endPatternAttach(
    distance: { x: number; y: number },
    onPointerIdle?: () => void
  ): { gesture: boolean; deckId: string | null } {
    const deckId = this.themeDropDeckId();
    this.clearPatternAttachHover();
    this.deferPointerIdle(onPointerIdle);
    return { gesture: isDragGesture(distance), deckId };
  }

  endThemeReturn(
    distance: { x: number; y: number },
    onPointerIdle?: () => void
  ): { gesture: boolean; returnHot: boolean } {
    const returnHot = this.themeReturnHot();
    this.clearThemeReturn();
    this.deferPointerIdle(onPointerIdle);
    return { gesture: isDragGesture(distance), returnHot };
  }

  clearDeckThemeDrop(): void {
    this.themeDropDeckId.set(null);
  }

  clearPatternAttachHover(): void {
    this.clearDeckThemeDrop();
    this.peekDrawer.set(false);
  }

  clearThemeReturn(): void {
    this.themeReturnHot.set(false);
  }

  consumePeekDrawer(): void {
    this.peekDrawer.set(false);
  }

  private deferPointerIdle(onPointerIdle?: () => void): void {
    window.setTimeout(() => {
      this.pointerDrag.set(false);
      onPointerIdle?.();
    }, 0);
  }
}
