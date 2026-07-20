import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';

import { DeckForm } from '../deck-form/deck-form';

import { MtgSet } from '../../../shared/models/set';
import { DeckService } from '../../../core/services/deck.service';
import { MtgDeck } from '../../../shared/models/deck';

@Component({
  selector: 'app-add-deck',
  standalone: true,
  imports: [
    MatCardModule,
    DeckForm
  ],
  templateUrl: './add-deck.html',
  styleUrls: ['./add-deck.css']
})
export class AddDeck implements OnInit {
  private readonly deckService = inject(DeckService);
  private readonly router = inject(Router);

  // 1. Accept the active puzzle set context passed down from your router or parent layout
  @Input() set!: MtgSet;

  errorMessage: string | null = null;

  // 2. Define standard default values that your Dumb Form Component needs to map its fields
  defaultValues = {
    name: '',
    arenaDeck: '' // Clean empty string base ready to accept an optional text import copy-paste
  };

  ngOnInit(): void {
    if (!this.set) {
      console.warn('AddDeckView initialized without a bounding active MtgSet context.');
    }
  }

  /**
   * Orchestrates the persistence workflow when the dumb form submits valid data
   */
  handleSubmit(values: { name: string; arenaDeck: string | null }) {
    this.errorMessage = null;

    if (!this.set?.id) {
      this.errorMessage = 'No active set selected for this deck container.';
      return;
    }

    const clientGeneratedUuid = crypto.randomUUID();

    // Instantiate a fresh clean model
    const deck = new MtgDeck({
      id: clientGeneratedUuid,
      setId: this.set.id,
      name: values.name,
      tags: [],
      notes: '',
      cards: new Map<string, number>()
    });

    // 3. INTERCEPT OPTIONAL IMPORT: If text is provided, let your domain parse it down
    if (values.arenaDeck?.trim()) {
      this.parseAndHydrateArenaImport(deck, values.arenaDeck);
    }

    this.deckService.create(deck).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        console.error('Failed to add deck container downstream:', err);
        this.errorMessage = 'An error occurred while saving the deck config to SQLite.';
      },
    });
  }

  /**
   * Helper utility to process optional MTG Arena text imports directly onto your model map
   */
  private parseAndHydrateArenaImport(deck: MtgDeck, textBlob: string): void {
    const lines = textBlob.split('\n').map(l => l.trim()).filter(Boolean);
    const arenaLineRegex = /^(\d+)\s+(.+?)\s+\(([A-Z0-9]+)\)\s+(\d+)$/;

    for (const line of lines) {
      const match = arenaLineRegex.exec(line);
      if (!match) continue;

      const [_, qtyStr, cardId] = match;
      const quantity = parseInt(qtyStr, 10);

      // Utilize your clean domain model methods to allocate the cards safely
      deck.assignCard(cardId, quantity);
    }
  }
}
