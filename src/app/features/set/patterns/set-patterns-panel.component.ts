import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
  NgZone,
  OnDestroy,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragEnd, CdkDragMove, DragDropModule } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DeckService } from '../../../core/services/deck.service';
import { isDragGesture } from '../../deck/deck.drag';
import { PatternState } from '../set.board';
import { SetBoardDrag } from '../set-board-drag';

@Component({
  selector: 'app-set-patterns-panel',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './set-patterns-panel.html',
  styleUrls: ['./set-patterns-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetPatternsPanelComponent implements OnDestroy {
  private readonly deckService = inject(DeckService);
  private readonly drag = inject(SetBoardDrag);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  public readonly patternState = input.required<PatternState>();
  public readonly selectedTheme = input<string | null>(null);
  public readonly drawerOpen = input(true);

  public readonly themeSelect = output<string>();

  public readonly themeReturnHot = this.drag.themeReturnHot;

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public onPatternClick(phrase: string): void {
    if (this.drag.pointerDrag()) {
      return;
    }
    this.themeSelect.emit(phrase);
  }

  public onThemeDragStarted(): void {
    this.drag.pointerDrag.set(true);
  }

  public onThemeDragMoved(event: CdkDragMove<string>): void {
    this.ngZone.run(() => this.drag.hoverPatternAttach(event.event, this.drawerOpen()));
  }

  public onThemeDragEnded(event: CdkDragEnd<string>): void {
    const deckId = this.drag.themeDropDeckId();
    this.drag.clearPatternAttachHover();
    window.setTimeout(() => {
      this.drag.pointerDrag.set(false);
      this.cdr.markForCheck();
    }, 0);

    if (!isDragGesture(event.distance)) {
      return;
    }

    const phrase = event.source.data;
    if (!deckId || typeof phrase !== 'string' || !phrase.trim()) {
      return;
    }

    this.deckService.attachTheme(deckId, phrase).pipe(takeUntil(this.destroy$)).subscribe();
  }
}
