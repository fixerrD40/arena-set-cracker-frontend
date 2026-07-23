import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';

import { DeckForm } from '../deck-form/deck-form';

import { MtgSet } from '../../../shared/models/set/set';
import { MtgDeck } from '../../../shared/models/deck/deck';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DATA_WIRE_TOKEN } from '../../../app.config';
import { SetService } from '../../../core/services/set.service';
import { decks } from '../../../core/storage/sqlite/sqlite.schema';
import { parseArenaTextToDeckMap } from '../../../shared/models/deck/deck.utils';

@Component({
  selector: 'app-add-deck',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, DeckForm],
  templateUrl: './add-deck.html',
  styleUrls: ['./add-deck.css']
})
export class AddDeck implements OnInit {
  private readonly dataWire = inject(DATA_WIRE_TOKEN); // Blind platform conductor
  private readonly setService = inject(SetService);     // Parent context coordinator
  private readonly router = inject(Router);

  // Accept the active set context passed down from your router or parent layout
  @Input() set!: MtgSet;

  public errorMessage: string | null = null;

  // Form initialization structures
  public defaultValues = {
    name: '',
    arenaDeck: ''
  };

  public ngOnInit(): void {
    if (!this.set) {
      console.warn('[AddDeck] Initialized without a bounding active MtgSet context.');
    }
  }

  /**
   * Orchestrates the persistence workflow when the form submits valid data.
   */
  public handleSubmit(values: { name: string; arenaDeck: string | null }): void {
    this.errorMessage = null;

    if (!this.set?.id) {
      this.errorMessage = 'No active set selected for this deck container.';
      return;
    }

    // 1. Intercept optional clipboard copy-pastes using our pure utility function [INDEX]
    const initialCardsMap = values.arenaDeck
      ? parseArenaTextToDeckMap(values.arenaDeck)
      : new Map<string, number>();

    // 2. Assemble a clean, pure data interface literal object contract [INDEX]
    const freshDomainDeck: MtgDeck = {
      id: crypto.randomUUID(), // Secure client-side text string UUID generation
      setId: this.set.id,
      name: values.name,
      tags: [],
      notes: '',
      cards: initialCardsMap // Populated instantly with your parsed clipboard values
    };

    // 3. DEFER WRITES TO THE DATA WIRE BLINDLY [INDEX]:
    // On Desktop, ElectronDataWire handles SQLite columns serialization and logs outbox tracking [INDEX].
    // On Web, CloudDataWire dispatches an HTTP POST over network REST API channels seamlessly [INDEX].
    this.dataWire.insert<typeof decks, MtgDeck, MtgDeck>(decks, freshDomainDeck).subscribe({
      next: () => {
        console.log(`[AddDeck] Deck "${freshDomainDeck.name}" created seamlessly.`);

        // 4. Force the SetService context manager to reload, updating your active workspace streams
        this.setService.loadSetWorkspace(this.set.id, this.set.code);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('[AddDeck] Mutation write block dropped downstream:', err);
        this.errorMessage = 'An error occurred while saving the deck configuration.';
      }
    });
  }
}
