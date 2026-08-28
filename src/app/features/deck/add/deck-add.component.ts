import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DeckService } from '../../../core/services/deck.service';
import { SetService } from '../../../core/services/set.service';
import { MtgDeck } from '../../../shared/models/deck/deck';
import { MtgSet } from '../../../shared/models/set/set';
import { parseArenaText, resolveArenaLinesToCardMap } from '../../../shared/models/deck/deck.utils';

@Component({
  selector: 'app-deck-add',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './deck-add.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./deck-add.css']
})
export class DeckAddComponent implements OnInit {
  private readonly deckService = inject(DeckService);
  private readonly setService = inject(SetService);
  private readonly router = inject(Router);

  public activeSet: MtgSet | null = null;
  public errorMessage: string | null = null;
  public strippedNotice: string | null = null;

  public readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    arenaDeck: new FormControl<string | null>('')
  });

  public ngOnInit(): void {
    const currentWorkspace = this.setService.currentWorkspaceSnapshot;

    if (currentWorkspace?.setInfo) {
      this.activeSet = currentWorkspace.setInfo;
      this.form.patchValue({
        name: `Custom ${this.activeSet.name} Deck`
      });
    } else {
      this.errorMessage =
        'No active set workspace. Open an installed set from the library before creating a deck.';
    }
  }

  public onSubmit(): void {
    if (this.form.invalid) return;
    this.errorMessage = null;
    this.strippedNotice = null;

    if (!this.activeSet?.id || !this.activeSet?.code) {
      this.errorMessage =
        'No active set workspace context has been initialized. Select an installed set before creating custom decks.';
      return;
    }

    const workspace = this.setService.currentWorkspaceSnapshot;
    if (!workspace?.cards?.length) {
      this.errorMessage = 'This set has no card catalog loaded yet. Wait for install to finish, then try again.';
      return;
    }

    const { name, arenaDeck } = this.form.getRawValue();
    const pasted = (arenaDeck || '').trim();
    let cards = new Map<string, number>();

    if (pasted) {
      const lines = parseArenaText(pasted);
      if (lines.length === 0) {
        this.errorMessage = 'Could not parse any Arena deck lines. Paste an export from MTG Arena.';
        return;
      }

      const resolved = resolveArenaLinesToCardMap(lines, workspace.cards);
      if (resolved.cards.size === 0) {
        this.errorMessage =
          'No cards from that paste matched this set’s catalog. Confirm the deck is for the set you have open.';
        return;
      }

      cards = resolved.cards;

      if (resolved.unmatched.length > 0) {
        const names = [...new Set(resolved.unmatched.map((l) => l.name))];
        this.strippedNotice = `Stripped ${resolved.unmatched.length} line(s) not in ${this.activeSet.name}: ${names.join(', ')}`;
      }
    }

    const freshDomainDeck: MtgDeck = {
      id: crypto.randomUUID(),
      setId: this.activeSet.id,
      name: name.trim(),
      tags: [],
      notes: '',
      coverCardId: '',
      cards
    };

    this.deckService.insertNewDeckPayload(freshDomainDeck).subscribe({
      next: () => {
        this.router.navigate(['/set', this.activeSet!.id, 'deck', freshDomainDeck.id]);
      },
      error: (err) => {
        console.error('[AddDeck] Mutation write block dropped downstream:', err);
        this.errorMessage = 'An error occurred while saving the deck configuration.';
      }
    });
  }
}
