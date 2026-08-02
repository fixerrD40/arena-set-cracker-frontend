import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ENTER, COMMA } from '@angular/cdk/keycodes';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DeckService } from '../../core/services/deck.service';
import { SetService } from '../../core/services/set.service';
import { DeckValidationResult } from '../../shared/models/deck/deck';

@Component({
  selector: 'app-deck-content',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    NgxTippyModule
  ],
  templateUrl: './deck.component.html', // Points straight to your updated clean HTML wireframe file
  styleUrls: ['./deck.component.css']
})
export class Deck implements OnInit, OnDestroy {
  private readonly deckService = inject(DeckService);
  private readonly setService = inject(SetService);
  private readonly route = inject(ActivatedRoute);

  private readonly destroy$ = new Subject<void>();

  // ─── CENTRALIZED DATA PIPELINES ────────────────────────────────────
  public readonly scratchpadDeck$ = this.deckService.scratchpadDeck$;
  public readonly displayedCards$ = this.deckService.displayedCards$;
  public readonly isDirty$ = this.deckService.isDirty$;

  // ─── LOCAL UI PROPERTY FIELDS ──────────────────────────────────────
  public editing = false;
  public readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  public ngOnInit(): void {
    /**
     * URL PARAMETER HOOK
     * Continuously monitors route changes. If a user navigates to a new
     * identifier string or reloads, this triggers a fresh service lookup loop.
     */
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editing = false;

        // Command our stateful coordinator service to map out data subjects
        this.deckService.loadDeckByIdFromWorkspace(id);
      }
    });
  }

  public ngOnDestroy(): void {
    // Teardown allocated properties to clear indexing titles across your application shell shell layouts
    this.deckService.clearActiveDeck();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── INLINE RENAME LAYER MUTATIONS ──────────────────────────────────

  public toggleEdit(): void {
    this.editing = !this.editing;
  }

  public cancelEdit(): void {
    this.editing = false;
  }

  public saveInlineName(newName: string): void {
    const current = this.deckService.scratchpadValue;
    const trimmed = newName.trim();

    if (current && trimmed) {
      this.deckService.updateScratchpad({ ...current, name: trimmed });
    }
    this.editing = false;
  }

  // ─── CARD MATRIX VALUE QUANTITY MANAGEMENT ──────────────────────────

  public handleIncrementCard(cardId: string): void {
    const current = this.deckService.scratchpadValue;
    if (!current) return;

    const updatedMap = this.deckService.incrementInMap(current.cards, cardId);
    this.deckService.updateScratchpad({ ...current, cards: updatedMap });
  }

  public handleDecrementCard(cardId: string): void {
    const current = this.deckService.scratchpadValue;
    if (!current) return;

    const updatedMap = this.deckService.decrementInMap(current.cards, cardId);
    this.deckService.updateScratchpad({ ...current, cards: updatedMap });
  }

  // ─── IN-MEMORY TAG & CHIP MANAGEMENT ────────────────────────────────

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
      tags: current.tags.filter(t => t !== tag)
    });
  }

  // ─── IN-MEMORY NOTES MANAGEMENT ────────────────────────────────────

  public saveNotes(text: string): void {
    const current = this.deckService.scratchpadValue;
    if (!current || current.notes === text) return;

    this.deckService.updateScratchpad({ ...current, notes: text });
  }

  // ─── AUTHORITATIVE DATABASE PERSISTENCE COMMAND ROUTERS ────────────

  public handleSaveChanges(): void {
    this.deckService.flush().subscribe({
      next: () => {
        this.editing = false;
        console.log('[Deck] Active workspace scratchpad changes successfully committed to the database storage layer.');
      }
    });
  }

  public handleCancelChanges(): void {
    const original = this.deckService.activeDeckSnapshot;
    if (original) {
      // Re-hydrate matching baseline variables to drop temporary memory strings
      this.deckService.setActiveDeck(original);
    }
    this.editing = false;
  }

  // ─── VIEW PRESENTATION FORMATTING HELPERS ──────────────────────────

  public getCardTooltip(cardId: string): string {
    const workspace = this.setService.currentWorkspaceSnapshot;
    if (!workspace) return '';

    const matchingCard = workspace.cards.find(c => String(c.id) === String(cardId));
    if (!matchingCard || !matchingCard.localArtUri) return '';

    return `<img src="${matchingCard.localArtUri}" alt="${matchingCard.name}" style="width: 140px; height: auto; border-radius: 6px; display: block;" />`;
  }

  public runDeckValidations(): DeckValidationResult {
    const current = this.deckService.scratchpadValue;

    if (!current) {
      return { valid: false, errors: ['No active workspace dataset parsing frame available.'] };
    }

    const result: DeckValidationResult = { valid: true, errors: [] };

    if (!current.name || current.name.trim().length === 0) {
      result.valid = false;
      result.errors.push('Deck profile name descriptor string cannot be left blank.');
    }

    if (this.editing) {
      result.valid = false;
      result.errors.push('Cannot lock down record while sub-form input controllers are active.');
    }

    return result;
  }
}
