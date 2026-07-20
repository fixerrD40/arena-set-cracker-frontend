import { Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { map, Observable } from 'rxjs';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { DeckService } from '../../../core/services/deck.service';
import { CardService } from '../../../core/services/card.service';
import { MtgDeck } from '../../../shared/models/deck';
import { MtgCard } from '../../../shared/models/card';
import { DeckForm } from '../deck-form/deck-form';

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
  private readonly cardService = inject(CardService);

  @Input() deck: MtgDeck | undefined;

  editing = false;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  // The single unified reactive data channel for your HTML template loop
  public displayedCards$?: Observable<Array<{ card: MtgCard; quantity: number }>>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['deck'] && this.deck) {
      this.editing = false;
      this.syncRelationalWorkspaceStreams();
    }
  }

  private syncRelationalWorkspaceStreams(): void {
    if (!this.deck) return;

    this.displayedCards$ = this.cardService.activeCards$.pipe(
      map((allAvailableCards) => {
        const list: Array<{ card: MtgCard; quantity: number }> = [];

        for (const card of allAvailableCards) {
          const quantityInDeck = this.deck!.cards.get(String(card.id));

          if (quantityInDeck && quantityInDeck > 0) {
            list.push({ card, quantity: quantityInDeck });
          }
        }
        return list;
      })
    );
  }

  /**
   * Tooltip Generator Hook: Pulls local device storage asset paths natively
   * out of your pre-hydrated stream to render card graphics offline.
   */
  public getCardTooltip(cardId: string): string {
    const activeCards = this.cardService.snapshotOfActiveCards;
    const matchingCard = activeCards.find(c => String(c.id) === String(cardId));

    if (!matchingCard || !matchingCard.localArtUri) return '';

    // Returns an HTML string layout for Tippy to parse dynamically
    return `<img src="${matchingCard.localArtUri}" alt="${matchingCard.name}" style="width: 140px; height: auto; border-radius: 6px; display: block;" />`;
  }

  public handleIncrementCard(cardId: string): void {
    if (!this.deck) return;

    this.deck.incrementCard(String(cardId));
    this.deckService.update(this.deck.id, this.deck).subscribe({
      next: () => this.syncRelationalWorkspaceStreams()
    });
  }

  public handleDecrementCard(cardId: string): void {
    if (!this.deck) return;

    this.deck.decrementCard(String(cardId));
    this.deckService.update(this.deck.id, this.deck).subscribe({
      next: () => this.syncRelationalWorkspaceStreams()
    });
  }

  public addTag(event: any): void {
    if (!this.deck) return;

    const input = event.input;
    const value = event.value?.trim();

    if (value && !this.deck.tags.includes(value)) {
      this.deck.tags.push(value);
      this.deckService.update(this.deck.id, this.deck).subscribe();
    }

    if (input) {
      input.value = '';
    }
  }

  public removeTag(tag: string): void {
    if (!this.deck) return;

    this.deck.tags = this.deck.tags.filter(t => t !== tag);
    this.deckService.update(this.deck.id, this.deck).subscribe();
  }

  public saveNotes(newNotes: string): void {
    if (!this.deck || this.deck.notes === newNotes) return;

    this.deck.notes = newNotes;
    this.deckService.update(this.deck.id, this.deck).subscribe();
  }

  public saveDeckFromForm(values: { name: string; arenaDeck: string | null }): void {
    if (!this.deck) return;

    this.deck.name = values.name;

    if (values.arenaDeck?.trim()) {
      this.deck.cards.clear();

      const lines = values.arenaDeck.split('\n').map(l => l.trim()).filter(Boolean);
      const arenaLineRegex = /^(\d+)\s+(.+?)\s+\(([A-Z0-9]+)\)\s+(\d+)$/;

      for (const line of lines) {
        const match = arenaLineRegex.exec(line);
        if (!match) continue;

        const [_, qtyStr, cardId] = match;
        this.deck.assignCard(String(cardId), parseInt(qtyStr, 10));
      }
    }

    this.deckService.update(this.deck.id, this.deck).subscribe({
      next: () => {
        this.editing = false;
        this.syncRelationalWorkspaceStreams();
      },
      error: err => console.error('Failed to commit assignment adaptations:', err?.message || err)
    });
  }

  public toggleEdit(): void {
    this.editing = !this.editing;
  }

  public cancelEdit(): void {
    this.editing = false;
  }
}
