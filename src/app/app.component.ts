import { Component, inject, OnInit, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

// Angular Material Imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';

// Domain Services
import { UserProfileService } from './core/services/user-profile.service';
import { AuthService } from './core/services/auth.service';
import { SetService } from './core/services/set.service';
import { DeckService } from './core/services/deck.service';

// Components
import { DeckContent } from './features/deck/deck-content/deck-content'

// Models
import { MtgSet } from './shared/models/set';
import { MtgDeck } from './shared/models/deck';

@Component({
  selector: 'app-root',
  standalone: true, // Configures this as a standalone element
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatTooltipModule,
    DeckContent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  public readonly userProfileService = inject(UserProfileService);
  private readonly authService = inject(AuthService);
  private readonly setService = inject(SetService);
  private readonly deckService = inject(DeckService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly sets$ = this.setService.installedSets$;

  // 1. FIXED: Point to 'activeDecks$' which represents the multi-deck puzzle assignment matrix array
  readonly activeDecks$ = this.deckService.activeDecks$;

  isShowing = true;

  // Converted to a trackable signal to remove the funky template function execution loop
  protected readonly expandedSetId = signal<string | null>(null);

  // 2. CONCEPTUAL CHANGE: Active working workspace pointer initialized directly in memory
  selectedDeck: MtgDeck | null = null;

  /**
   * Selection handler triggered synchronously whenever a user clicks a deck row in the template
   */
  selectDeckWorkspace(deck: MtgDeck): void {
    this.selectedDeck = deck;
  }

  toggleSet(entry: { set: MtgSet }): void {
    const targetSetId = entry.set.id;

    this.selectedDeck = null;

    if (this.expandedSetId() === targetSetId) {
      this.expandedSetId.set(null);
      this.setService.unloadSetFromMemory();
    } else {
      this.expandedSetId.set(targetSetId);
      this.setService.toggleSetInMemory(entry.set);
    }
  }

  addSet(): void {
    // Navigate or display add-set prompt sequence
    console.log('Spawning Scryfall installation download query modal');
  }

  deleteSet(setId: string): void {
    if (confirm('Permanently purge this set and all associated decks from disk?')) {
      this.setService.uninstall(setId);
    }
  }

  addDeck(set: MtgSet): void {
    const deckName = prompt('Enter New Custom Deck Name:');
    if (!deckName) return;

    // 0. Generate a client-side string UUID to fulfill your schema rules
    const uuid = crypto.randomUUID();

    const blankDeck = new MtgDeck({
      id: uuid, // Securely filled text string id
      setId: set.id,
      name: deckName,
      tags: [],
      notes: '',
      cards: new Map<string, number>() // Clear, ready assignment matrix base
    });

    // 2. Persist directly down into SQLite.
    // The service's 'tap' operator handles sliding it into activeDecks$ automatically!
    this.deckService.create(blankDeck)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err) => console.error('Failed to create new deck container:', err.message)
      });
  }

  logout(): void {
    this.setService.unloadSetFromMemory();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
