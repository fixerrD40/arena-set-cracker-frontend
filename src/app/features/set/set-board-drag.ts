import { Injectable, signal } from '@angular/core';

import { dragClientPoint } from './set.board';

const DRAWER_PEEK_PX = 56;

@Injectable()
export class SetBoardDrag {
  readonly themeDropDeckId = signal<string | null>(null);
  readonly themeReturnHot = signal(false);
  readonly pointerDrag = signal(false);
  readonly peekDrawer = signal(false);

  hoverDeckThemeDrop(event: MouseEvent | TouchEvent): void {
    const { x, y } = dragClientPoint(event);
    const hit = document.elementFromPoint(x, y);
    const row = hit?.closest('[data-set-drop="deck-theme"]');
    const deckId = row?.getAttribute('data-deck-id') ?? null;
    this.themeDropDeckId.set(deckId);
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
    const { x, y } = dragClientPoint(event);
    const hit = document.elementFromPoint(x, y);
    this.themeReturnHot.set(!!hit?.closest('[data-set-drop="theme-pool"]'));
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
}
