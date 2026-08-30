import { Component, ElementRef, inject, input, output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { DeckService } from '../../../core/services/deck.service';
import { DECK_STATUSES, DECK_STATUS_LABELS, DeckStatus } from '../../../shared/models/deck/deck';
import { DeckSummary, curveBarHeight, curvePeak } from '../../../shared/models/deck/deck.stats';

@Component({
  selector: 'app-deck-details',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  templateUrl: './deck-details.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./deck-details.css']
})
export class DeckDetailsComponent {
  private readonly deckService = inject(DeckService);

  public readonly summary = input.required<DeckSummary>();
  public readonly back = output<void>();

  @ViewChild('renameInput') renameInput?: ElementRef<HTMLInputElement>;

  public readonly scratchpadDeck$ = this.deckService.scratchpadDeck$;
  public readonly statuses = DECK_STATUSES;
  public readonly statusLabels = DECK_STATUS_LABELS;
  public renaming = false;
  public readonly curveBarHeight = curveBarHeight;
  public readonly curvePeak = curvePeak;

  public startRename(): void {
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

  public setStatus(status: DeckStatus): void {
    const current = this.deckService.scratchpadValue;
    if (!current || current.status === status) return;
    this.deckService.updateScratchpad({ ...current, status });
  }

  public removeTheme(theme: string): void {
    const current = this.deckService.scratchpadValue;
    if (!current) return;

    this.deckService.updateScratchpad({
      ...current,
      themes: current.themes.filter((entry) => entry !== theme)
    });
  }

  public saveNotes(text: string): void {
    const current = this.deckService.scratchpadValue;
    if (!current || current.notes === text) return;

    this.deckService.updateScratchpad({ ...current, notes: text });
  }
}
