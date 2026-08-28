import { Component, ElementRef, inject, NgZone, OnDestroy, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { DeckService } from '../../core/services/deck.service';
import { SetService } from '../../core/services/set.service';
import { DeckValidationResult } from '../../shared/models/deck/deck';
import { ColorDisplayNames } from '../../shared/models/color';
import {
  ArenaCollectionFilter,
  MANA_COLORS,
  ManaColor,
  cardMatchesArenaCollectionFilter,
  compareArenaCollection,
  emptyArenaCollectionFilter
} from '../../shared/models/card/arena-collection.filter';
import { MtgCard } from '../../shared/models/card/card';
import { showsInfinityCopyMark } from '../../shared/models/deck/deck.copy-limit';
import { summarizeDeck } from '../../shared/models/deck/deck.stats';
import { DeckDetailsComponent } from './details/deck-details.component';
import { DeckContentsComponent } from './contents/deck-contents.component';
import { CDK_DRAG_CONFIG, CdkDragEnd, CdkDragMove, DragDropModule } from '@angular/cdk/drag-drop';
import { DeckBuilderDrag, DeckDragPayload, isDragGesture } from './deck.drag';

@Component({
  selector: 'app-deck',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DragDropModule,
    DeckDetailsComponent,
    DeckContentsComponent
  ],
  providers: [
    DeckBuilderDrag,
    { provide: CDK_DRAG_CONFIG, useValue: { zIndex: 4000, previewContainer: 'global' } }
  ],
  templateUrl: './deck.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./deck.css']
})
export class DeckComponent implements OnDestroy {
  private readonly deckService = inject(DeckService);
  private readonly setService = inject(SetService);
  private readonly router = inject(Router);
  public readonly drag = inject(DeckBuilderDrag);
  private readonly ngZone = inject(NgZone);

  @ViewChild(DeckContentsComponent) private contents?: DeckContentsComponent;
  @ViewChild(DeckDetailsComponent) private detailsPanel?: DeckDetailsComponent;
  @ViewChild('collectionStage')
  set collectionStage(ref: ElementRef<HTMLElement> | undefined) {
    this.unbindCollectionWheel();
    this.collectionStageEl = ref?.nativeElement;
    this.bindCollectionWheel();
  }

  public readonly manaColors = MANA_COLORS;
  public readonly showsInfinityCopyMark = showsInfinityCopyMark;
  public readonly copyPips = [1, 2, 3, 4] as const;
  public readonly collectionPageSize = 8;

  public filter: ArenaCollectionFilter = emptyArenaCollectionFilter();
  public screen: 'builder' | 'details' = 'builder';

  private readonly collectionFilter$ = new BehaviorSubject<ArenaCollectionFilter>(this.filter);
  private readonly collectionPage$ = new BehaviorSubject(0);
  private collectionStageEl?: HTMLElement;
  private collectionPageIndex = 0;
  private collectionPageCount = 1;
  private wheelGate = false;
  private pointerDrag = false;

  public readonly scratchpadDeck$ = this.deckService.scratchpadDeck$;
  public readonly workspace$ = this.setService.activeContext$;

  public readonly filteredCards$ = combineLatest({
    lines: this.deckService.catalogLines$,
    filter: this.collectionFilter$
  }).pipe(
    map(({ lines, filter }) =>
      lines
        .filter((line) => cardMatchesArenaCollectionFilter(line.card, filter))
        .sort((a, b) => compareArenaCollection(a.card, b.card))
    )
  );

  public readonly collectionPageView$ = combineLatest({
    cards: this.filteredCards$,
    page: this.collectionPage$
  }).pipe(
    map(({ cards, page }) => {
      const pageCount = Math.max(1, Math.ceil(cards.length / this.collectionPageSize));
      const safePage = Math.min(Math.max(0, page), pageCount - 1);
      const start = safePage * this.collectionPageSize;
      this.collectionPageIndex = safePage;
      this.collectionPageCount = pageCount;
      return {
        cards: cards.slice(start, start + this.collectionPageSize),
        page: safePage,
        pageCount,
        total: cards.length
      };
    })
  );

  public readonly deckSummary$ = this.deckService.catalogLines$.pipe(
    map((lines) => summarizeDeck(lines.filter((line) => line.quantity > 0)))
  );

  public ngOnDestroy(): void {
    this.unbindCollectionWheel();
    if (!this.router.url.includes('/deck/')) {
      this.deckService.clearActiveDeck();
    }
  }

  public colorLabel(color: ManaColor): string {
    return ColorDisplayNames[color];
  }

  public isColorOn(color: ManaColor): boolean {
    return this.filter.colors.includes(color);
  }

  public toggleManaColor(color: ManaColor): void {
    const colors = this.isColorOn(color)
      ? this.filter.colors.filter((entry) => entry !== color)
      : [...this.filter.colors, color];
    this.pushFilter({ ...this.filter, colors });
  }

  public toggleColorless(): void {
    this.pushFilter({ ...this.filter, colorless: !this.filter.colorless });
  }

  public toggleMulticolor(): void {
    this.pushFilter({ ...this.filter, multicolor: !this.filter.multicolor });
  }

  public toggleLand(): void {
    this.pushFilter({ ...this.filter, land: !this.filter.land });
  }

  public onCollectionTextChange(text: string): void {
    this.pushFilter({ ...this.filter, text });
  }

  public clearCollectionText(): void {
    this.onCollectionTextChange('');
  }

  private pushFilter(next: ArenaCollectionFilter): void {
    this.filter = next;
    this.collectionFilter$.next(next);
    this.collectionPage$.next(0);
  }

  public nextCollectionPage(): void {
    if (this.collectionPageIndex + 1 < this.collectionPageCount) {
      this.collectionPage$.next(this.collectionPageIndex + 1);
    }
  }

  public prevCollectionPage(): void {
    if (this.collectionPageIndex > 0) {
      this.collectionPage$.next(this.collectionPageIndex - 1);
    }
  }

  public onCollectionKeydown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      this.nextCollectionPage();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      this.prevCollectionPage();
    }
  }

  private bindCollectionWheel(): void {
    this.collectionStageEl?.addEventListener('wheel', this.onCollectionWheelNative, { passive: false });
  }

  private unbindCollectionWheel(): void {
    this.collectionStageEl?.removeEventListener('wheel', this.onCollectionWheelNative);
  }

  private readonly onCollectionWheelNative = (event: WheelEvent): void => {
    event.preventDefault();
    if (this.wheelGate || event.deltaY === 0) return;
    this.wheelGate = true;
    window.setTimeout(() => {
      this.wheelGate = false;
    }, 90);
    if (event.deltaY > 0) this.nextCollectionPage();
    else this.prevCollectionPage();
  };

  public openDetails(): void {
    this.screen = 'details';
  }

  public backToBuilder(): void {
    this.screen = 'builder';
  }

  public collectionDrag(card: MtgCard): DeckDragPayload {
    return { card, source: 'collection' };
  }

  public handleIncrementCard(card: MtgCard): void {
    if (this.pointerDrag) return;
    this.deckService.addCopy(card);
  }

  public onCardDragStarted(): void {
    this.pointerDrag = true;
  }

  public onCardDragMoved(event: CdkDragMove<DeckDragPayload>): void {
    this.ngZone.run(() => this.drag.hover(event.event));
  }

  public onCardDragEnded(event: CdkDragEnd<DeckDragPayload>): void {
    const zone = this.drag.zone();
    this.drag.clear();
    window.setTimeout(() => {
      this.pointerDrag = false;
    }, 0);

    if (!isDragGesture(event.distance)) return;

    const payload = event.source.data;
    const card = payload?.card;
    if (!card) return;

    if (zone === 'cover') {
      this.deckService.setCoverCard(String(card.id));
    } else if (zone === 'list' && payload.source === 'collection') {
      this.deckService.addCopy(card);
    }
  }

  public runDeckValidations(): DeckValidationResult {
    const current = this.deckService.scratchpadValue;

    if (!current) {
      return { valid: false, errors: ['No active workspace dataset parsing frame available.'] };
    }

    const result: DeckValidationResult = { valid: true, errors: [] };

    if (!current.name || current.name.trim().length === 0) {
      result.valid = false;
      result.errors.push('Deck profile name descriptor string cannot be left blank.');
    }

    if (this.contents?.renaming || this.detailsPanel?.renaming) {
      result.valid = false;
      result.errors.push('Cannot lock down record while sub-form input controllers are active.');
    }

    return result;
  }
}
