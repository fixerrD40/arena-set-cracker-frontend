import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DeckService } from '../../../core/services/deck.service';
import { SetService } from '../../../core/services/set.service';

// Preserved from your original file imports
import { MtgDeck } from '../../../shared/models/deck/deck';
import { MtgSet } from '../../../shared/models/set/set';
import { parseArenaTextToDeckMap } from '../../../shared/models/deck/deck.utils';


@Component({
  selector: 'app-deck-add',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './deck-add.html',
  styleUrls: ['./deck-add.css']
})
export class DeckAddComponent implements OnInit {
  private readonly deckService = inject(DeckService);
  private readonly setService = inject(SetService);
  private readonly router = inject(Router);

  // Preserved State References
  public activeSet: MtgSet | null = null;
  public errorMessage: string | null = null;

  // Modernized Native Angular Material Form Layout
  public readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    arenaDeck: new FormControl<string | null>('')
  });

  public ngOnInit(): void {
    // Preserved FIX 2: Dynamically resolve your active bounding set context
    const currentWorkspace = this.setService.currentWorkspaceSnapshot;

    if (currentWorkspace?.setInfo) {
      this.activeSet = currentWorkspace.setInfo;
      console.log(`[AddDeck] Bounded to active set environment workspace: ${this.activeSet.name}`);

      // Optional: Seed a smart default name placeholder
      this.form.patchValue({
        name: `Custom ${this.activeSet.name} Deck`
      });
    } else {
      console.warn('[AddDeck] Initialized without a bounding active MtgSet workspace snapshot.');
    }
  }

  /**
   * Orchestrates the persistence workflow when the form submits valid data.
   */
  public onSubmit(): void {
    if (this.form.invalid) return;
    this.errorMessage = null;

    // Preserved Invariant Validation Check
    if (!this.activeSet?.id || !this.activeSet?.code) {
      this.errorMessage = 'No active set workspace context has been initialized. Select an installed set before creating custom decks.';
      return;
    }

    const { name, arenaDeck } = this.form.getRawValue();

    // Preserved Arena parsing strategy: Create the real Map immediately
    const initialCardsMap = arenaDeck
      ? parseArenaTextToDeckMap(arenaDeck) : new Map<string, number>();

    const freshDomainDeck: MtgDeck = {
      id: crypto.randomUUID(),
      setId: this.activeSet.id,
      name: name.trim(),
      tags: [],
      notes: '',
      cards: initialCardsMap // Seeded map is bound directly to the database payload
    };

    // Forward the assembled payload directly to the service pipeline
    this.deckService.insertNewDeckPayload(freshDomainDeck).subscribe({
      next: () => {
        console.log(`[AddDeck] Deck "${freshDomainDeck.name}" created seamlessly.`);

        // Preserved Cache Reload Synchronizer
        this.setService.loadSetWorkspace(this.activeSet!.id, this.activeSet!.code);

        // Hydrate the service state immediately so the Site Index / App Header can see it
        this.deckService.setActiveDeck(freshDomainDeck);

        // Redirect straight to the new active workspace view
        this.router.navigate(['/decks', freshDomainDeck.id]);
      },
      error: (err) => {
        console.error('[AddDeck] Mutation write block dropped downstream:', err);
        this.errorMessage = 'An error occurred while saving the deck configuration.';
      }
    });
  }
}
