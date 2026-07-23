import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { DeckForm } from '../deck-form/deck-form';

import { MtgSet } from '../../../shared/models/set/set';
import { MtgDeck } from '../../../shared/models/deck/deck';
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
  private readonly dataWire = inject(DATA_WIRE_TOKEN);
  private readonly setService = inject(SetService);
  private readonly router = inject(Router);

  // 🌟 FIX 1: The router handles this view now; remove the @Input() decorator
  public activeSet: MtgSet | null = null;
  public errorMessage: string | null = null;

  public defaultValues = {
    name: '',
    arenaDeck: ''
  };

  public ngOnInit(): void {
    // 🌟 FIX 2: Dynamically resolve your active bounding set context from your core domain state
    const currentWorkspace = this.setService.currentWorkspaceSnapshot;

    if (currentWorkspace?.setInfo) {
      this.activeSet = currentWorkspace.setInfo;
      console.log(`[AddDeck] Bounded to active set environment workspace: ${this.activeSet.name}`);
    } else {
      console.warn('[AddDeck] Initialized without a bounding active MtgSet workspace snapshot.');
    }
  }

  /**
   * Orchestrates the persistence workflow when the form submits valid data.
   */
  public handleSubmit(values: { name: string; arenaDeck: string | null }): void {
    this.errorMessage = null;

    if (!this.activeSet?.id) {
      this.errorMessage = 'No active set workspace context has been initialized. Select an installed set before creating custom decks.';
      return;
    }

    const initialCardsMap = values.arenaDeck
      ? parseArenaTextToDeckMap(values.arenaDeck)
      : new Map<string, number>();

    const freshDomainDeck: MtgDeck = {
      id: crypto.randomUUID(),
      setId: this.activeSet.id,
      name: values.name,
      tags: [],
      notes: '',
      cards: initialCardsMap
    };

    // 🌟 FIX 3: Stripped legacy multi-generics down to <TInput, TOutput> to comply with the contract interface
    this.dataWire.insert<MtgDeck, MtgDeck>(decks, freshDomainDeck).subscribe({
      next: () => {
        console.log(`[AddDeck] Deck "${freshDomainDeck.name}" created seamlessly.`);

        // Force the SetService context manager to reload, updating active workspace streams
        this.setService.loadSetWorkspace(this.activeSet!.id, this.activeSet!.code);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('[AddDeck] Mutation write block dropped downstream:', err);
        this.errorMessage = 'An error occurred while saving the deck configuration.';
      }
    });
  }
}
