import { Component, ElementRef, inject, input, output, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { DeckService } from '../../../core/services/deck.service';
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
  public readonly separatorKeysCodes: number[] = [ENTER, COMMA];
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

  public addTag(event: MatChipInputEvent): void {
    const current = this.deckService.scratchpadValue;
    const value = (event.value || '').trim();

    if (current && value && !current.tags.includes(value)) {
      this.deckService.updateScratchpad({
        ...current,
        tags: [...current.tags, value]
      });
    }

    if (event.chipInput) {
      event.chipInput.clear();
    }
  }

  public removeTag(tag: string): void {
    const current = this.deckService.scratchpadValue;
    if (!current) return;

    this.deckService.updateScratchpad({
      ...current,
      tags: current.tags.filter((entry) => entry !== tag)
    });
  }

  public saveNotes(text: string): void {
    const current = this.deckService.scratchpadValue;
    if (!current || current.notes === text) return;

    this.deckService.updateScratchpad({ ...current, notes: text });
  }
}
