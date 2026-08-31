import { Component, ElementRef, inject, NgZone, output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CdkDragEnd, CdkDragMove, DragDropModule } from '@angular/cdk/drag-drop';
import { DeckBuilderDrag, DeckDragPayload, isDragGesture } from '../deck.drag';
import { firstValueFrom, map } from 'rxjs';
import { DeckService } from '../../../core/services/deck.service';
import { SetService } from '../../../core/services/set.service';
import { manaPipAsset } from '../../../shared/models/card/card.mana';
import { cardArtUri } from '../../../shared/models/card/card.art';
import { MtgCard } from '../../../shared/models/card/card';
import { compareArenaDeckList } from '../../../shared/models/card/arena-collection.filter';
import { CONSTRUCTED_DECK_SIZE } from '../../../shared/models/deck/deck.copy-limit';
import { deckCoverArtUri } from '../../../shared/models/deck/deck.cover';
import { MtgDeck } from '../../../shared/models/deck/deck';
import { formatArenaDeckExport } from '../../../shared/models/deck/deck.utils';
import {
  curveBarHeight,
  curvePeak,
  deckRowManaPips,
  deckRowTone,
  deckRowToneStyle,
  summarizeDeck
} from '../../../shared/models/deck/deck.stats';

@Component({
  selector: 'app-deck-contents',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './deck-contents.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./deck-contents.css']
})
export class DeckContentsComponent {
  private readonly deckService = inject(DeckService);
  private readonly setService = inject(SetService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  public readonly drag = inject(DeckBuilderDrag);
  private readonly ngZone = inject(NgZone);

  public readonly details = output<void>();

  @ViewChild('renameInput') renameInput?: ElementRef<HTMLInputElement>;

  public renaming = false;
  public exportNotice: string | null = null;
  public exportError: string | null = null;
  public hoveredCard: MtgCard | null = null;
  public previewTop = 0;
  public previewRight = 0;
  public readonly constructedSize = CONSTRUCTED_DECK_SIZE;
  public readonly manaPipAsset = manaPipAsset;
  public readonly deckRowManaPips = deckRowManaPips;
  public readonly deckRowTone = deckRowTone;
  public readonly deckRowToneStyle = deckRowToneStyle;
  public readonly curveBarHeight = curveBarHeight;
  public readonly curvePeak = curvePeak;
  public readonly cardArtUri = cardArtUri;

  public readonly scratchpadDeck$ = this.deckService.scratchpadDeck$;
  public readonly isDirty$ = this.deckService.isDirty$;

  public readonly assignedCards$ = this.deckService.catalogLines$.pipe(
    map((lines) =>
      lines
        .filter((line) => line.quantity > 0)
        .sort((a, b) => compareArenaDeckList(a.card, b.card))
    )
  );

  public readonly deckSummary$ = this.assignedCards$.pipe(map(summarizeDeck));

  private pointerDrag = false;

  public coverArtUri(deck: MtgDeck, assigned: { card: MtgCard }[]): string {
    const catalog = this.setService.currentWorkspaceSnapshot?.cards ?? assigned.map((line) => line.card);
    return deckCoverArtUri(
      deck.coverCardId,
      catalog,
      assigned.map((line) => line.card)
    );
  }

  public showRowPreview(event: MouseEvent, card: MtgCard): void {
    if (this.pointerDrag) return;
    this.hoveredCard = card;
    const hostBox = this.host.nativeElement.getBoundingClientRect();
    const rowBox = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.previewTop = Math.max(12, Math.min(rowBox.top, window.innerHeight - 360));
    this.previewRight = window.innerWidth - hostBox.left + 8;
  }

  public clearRowPreview(): void {
    this.hoveredCard = null;
  }

  public contentsDrag(card: MtgCard): DeckDragPayload {
    return { card, source: 'contents' };
  }

  public onDragStarted(): void {
    this.pointerDrag = true;
    this.hoveredCard = null;
  }

  public onDragMoved(event: CdkDragMove<DeckDragPayload>): void {
    this.ngZone.run(() => this.drag.hover(event.event));
  }

  public onDragEnded(event: CdkDragEnd<DeckDragPayload>): void {
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
    } else if (zone === 'library' && payload.source === 'contents') {
      this.deckService.removeAllCopies(String(card.id));
    }
  }

  public startRename(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.renaming = true;
    setTimeout(() => this.renameInput?.nativeElement.focus(), 0);
  }

  public cancelRename(): void {
    this.renaming = false;
  }

  public saveInlineName(newName: string): void {
    const current = this.deckService.scratchpadValue;
    const trimmed = newName.trim();

    if (current && trimmed) {
      this.deckService.updateScratchpad({ ...current, name: trimmed });
    }
    this.renaming = false;
  }

  public openDetails(): void {
    if (this.renaming || this.pointerDrag) return;
    this.details.emit();
  }

  public addCopyFromRow(event: Event, card: MtgCard): void {
    event.preventDefault();
    event.stopPropagation();
    this.deckService.addCopy(card);
  }

  public removeCopy(cardId: string): void {
    if (this.pointerDrag) return;
    this.deckService.removeCopy(cardId);
  }

  public handleCancelChanges(): void {
    const original = this.deckService.activeDeckSnapshot;
    if (original) {
      this.deckService.setActiveDeck(original);
    }
    this.renaming = false;
  }

  public async handleDone(): Promise<void> {
    const setId = this.setService.currentWorkspaceSnapshot?.setInfo.id;
    const leave = (): void => {
      if (setId) this.router.navigate(['/set', setId]);
    };

    const dirty = await firstValueFrom(this.deckService.isDirty$);
    if (!dirty) {
      leave();
      return;
    }

    this.deckService.flush().subscribe({ next: leave });
  }

  public async exportForArena(): Promise<void> {
    this.exportNotice = null;
    this.exportError = null;

    const workspace = this.setService.currentWorkspaceSnapshot;
    const assigned = await firstValueFrom(this.assignedCards$);
    const setCode = workspace?.setInfo.code;

    if (!setCode) {
      this.exportError = 'Open an installed set before exporting.';
      return;
    }

    const result = formatArenaDeckExport(
      assigned.map((line) => ({ card: line.card, quantity: line.quantity })),
      setCode
    );

    if (!result.ok) {
      this.exportError = result.error;
      return;
    }

    try {
      await navigator.clipboard.writeText(result.text);
      this.exportNotice = 'Arena deck copied to clipboard.';
    } catch {
      this.exportError = 'Could not copy to the clipboard. Check app permissions and try again.';
    }
  }
}
