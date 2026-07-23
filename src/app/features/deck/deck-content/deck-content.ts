// src/app/features/deck/deck-content.component.ts
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgxTippyModule } from 'ngx-tippy-wrapper';

import { MtgDeck } from '../../../shared/models/deck/deck';
import { MtgCard } from '../../../shared/models/card/card';
import { DeckService } from '../../../core/services/deck.service';
import { SetService } from '../../../core/services/set.service';
import { map } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { DeckForm } from '../deck-form/deck-form';

export interface DisplayedCardLine {
  card: MtgCard;
  quantity: number;
}

@Component({
  selector: 'app-deck-content',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    NgxTippyModule,
    DeckForm
  ],
  templateUrl: './deck-content.html',
  styleUrls: ['./deck-content.css']
})
export class DeckContent implements OnChanges {
  private readonly deckService = inject(DeckService);
  private readonly setService = inject(SetService);

  @Input() deck: MtgDeck | undefined;

  editing = false;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  // 🌟 LOCAL DECK SCRATCHPAD: Tracks all mutations (name, notes, tags, cards) cleanly in working RAM
  public readonly scratchpadDeck$ = new BehaviorSubject<MtgDeck | null>(null);

  public isDirty = false;
  public displayedCards$?: Observable<DisplayedCardLine[]>;

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['deck'] && this.deck) {
      this.editing = false;
      this.isDirty = false;

      // Seed our working memory with a deep clone of the fresh database disk record
      this.scratchpadDeck$.next(this.deepCloneDeck(this.deck));
      this.syncRelationalWorkspaceStreams();
    }
  }

  /**
   * MEMORY-DRIVEN RELATION STREAM
   * Combines static set cards with your component's live scratchpad configuration state.
   */
  private syncRelationalWorkspaceStreams(): void {
    if (!this.deck) return;

    this.displayedCards$ = combineLatest({
      workspace: this.setService.activeContext$,
      currentScratchpad: this.scratchpadDeck$.asObservable()
    }).pipe(
      map(({ workspace, currentScratchpad }) => {
        if (!workspace || !currentScratchpad) return [];

        const list: DisplayedCardLine[] = [];

        // Traverse the workspace reference catalog, filtering against our active scratchpad quantities
        for (const card of workspace.cards) {
          const quantityInDeck = currentScratchpad.cards.get(String(card.id));

          if (quantityInDeck && quantityInDeck > 0) {
            list.push({ card, quantity: quantityInDeck });
          }
        }
        return list;
      })
    );
  }

  // ==========================================================
  // CARD QUANTITY MANAGEMENT (Pure In-Memory Operations)
  // ==========================================================

  public handleIncrementCard(cardId: string): void {
    const current = this.scratchpadDeck$.getValue();
    if (!current) return;

    const updatedMap = this.deckService.incrementInMap(current.cards, cardId);
    this.updateScratchpad({ ...current, cards: updatedMap });
  }

  public handleDecrementCard(cardId: string): void {
    const current = this.scratchpadDeck$.getValue();
    if (!current) return;

    const updatedMap = this.deckService.decrementInMap(current.cards, cardId);
    this.updateScratchpad({ ...current, cards: updatedMap });
  }

  // ==========================================================
  // TAGS & CHIPS METRICS (Pure In-Memory Operations)
  // ==========================================================

  public addTag(event: MatChipInputEvent): void {
    const current = this.scratchpadDeck$.getValue();
    const value = (event.value || '').trim();

    if (current && value && !current.tags.includes(value)) {
      this.updateScratchpad({
        ...current,
        tags: [...current.tags, value]
      });
    }

    // Clear the native input field buffer
    if (event.chipInput) {
      event.chipInput.clear();
    }
  }

  public removeTag(tag: string): void {
    const current = this.scratchpadDeck$.getValue();
    if (!current) return;

    this.updateScratchpad({
      ...current,
      tags: current.tags.filter(t => t !== tag)
    });
  }

  // ==========================================================
  // NOTES & META FORMS (Pure In-Memory Operations)
  // ==========================================================

  public saveNotes(text: string): void {
    const current = this.scratchpadDeck$.getValue();
    if (!current || current.notes === text) return;

    this.updateScratchpad({ ...current, notes: text });
  }

  public toggleEdit(): void {
    this.editing = !this.editing;
  }

  public cancelEdit(): void {
    this.editing = false;
  }

  /** Handles text mutations emitting from the child sub-form component template */
  public saveDeckFromForm(values: { name: string; arenaDeck: string | null }): void {
    const current = this.scratchpadDeck$.getValue();
    if (!current) return;

    // Apply the fresh name token to the active scratchpad instance
    this.updateScratchpad({ ...current, name: values.name });
    this.editing = false;
  }

  /**
   * FINALIZED PERSISTENCE FLUSH
   * Gathers your accumulated local scratchpad memory modifications and hands them
   * directly to the DeckService to execute a database write lock operation.
   */
  public handleSaveChanges(): void {
    const finalizedDeck = this.scratchpadDeck$.getValue();
    if (!finalizedDeck) return;

    // 🌟 Call the service method cleanly!
    this.deckService.saveDeckChanges(finalizedDeck).subscribe({
      next: () => {
        this.isDirty = false;
        this.editing = false;
        console.log('[DeckContent] Complete sandbox scratchpad memory flushed securely to storage.');
      }
    });
  }

  public handleCancelChanges(): void {
    if (!this.deck) return;
    // Discard mutations by hard-resetting to the initial database disk snapshot
    this.scratchpadDeck$.next(this.deepCloneDeck(this.deck));
    this.isDirty = false;
    this.editing = false;
  }

  // ==========================================================
  // HELPERS & TOOLTIPS
  // ==========================================================

  public getCardTooltip(cardId: string): string {
    const workspace = this.setService.currentWorkspaceSnapshot;
    if (!workspace) return '';

    const matchingCard = workspace.cards.find(c => String(c.id) === String(cardId));
    if (!matchingCard || !matchingCard.localArtUri) return '';

    return `<img src="${matchingCard.localArtUri}" alt="${matchingCard.name}" style="width: 140px; height: auto; border-radius: 6px; display: block;" />`;
  }

  /** Core state synchronizer tracking working memory differentials to manage isDirty */
  private updateScratchpad(modifiedDeck: MtgDeck): void {
    if (!this.deck) return;

    this.scratchpadDeck$.next(modifiedDeck);

    // Differential Check: Evaluate serialization profiles to flip flags instantly
    const originalString = JSON.stringify({ n: this.deck.name, nt: this.deck.notes, t: this.deck.tags, c: Object.fromEntries(this.deck.cards) });
    const currentString = JSON.stringify({ n: modifiedDeck.name, nt: modifiedDeck.notes, t: modifiedDeck.tags, c: Object.fromEntries(modifiedDeck.cards) });

    this.isDirty = originalString !== currentString;
  }

  private deepCloneDeck(target: MtgDeck): MtgDeck {
    return {
      ...target,
      tags: [...target.tags],
      cards: new Map(target.cards)
    };
  }
}
