import { Component, inject, DestroyRef, signal } from '@angular/core';
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

// Components
import { DeckContent } from './features/deck/deck-content/deck-content'
import { DATA_WIRE_TOKEN } from './app.config';
import { map } from 'rxjs';
import { decks } from './core/storage/sqlite/sqlite.schema';

// Models
import { MtgDeck } from './shared/models/deck/deck';
import { MtgSet } from './shared/models/set/set';

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
  // Service-Level Injections
  public readonly userProfileService = inject(UserProfileService);
  private readonly authService = inject(AuthService);
  private readonly setService = inject(SetService);
  private readonly dataWire = inject(DATA_WIRE_TOKEN); // Used to pass table constraints blindly
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // 1. Sidemenu Sets Cache Stream
  readonly sets$ = this.setService.installedSets$;

  // 2. 🌟 RADICAL STATE CHANGE: Active decks now feed directly out of the
  // centralized active aggregate workspace snapshot container instead of DeckService!
  readonly activeDecks$ = this.setService.activeContext$.pipe(
    map((workspace) => workspace ? workspace.decks : [])
  );

  isShowing = true;

  // Signal layout managing accordions or dropdown view state metrics
  protected readonly expandedSetId = signal<string | null>(null);

  // Active workspace container deck layout pointer reference
  selectedDeck: MtgDeck | null = null;

  /**
   * Selection handler triggered synchronously whenever a user clicks a deck row in the template
   */
  public selectDeckWorkspace(deck: MtgDeck): void {
    this.selectedDeck = deck;
  }

  /**
   * Handles workspace context swaps atomically based on side-menu grid selection triggers.
   */
  public toggleSet(entry: { set: MtgSet }): void {
    const targetSetId = entry.set.id;

    // Reset view details to avoid template rendering mismatched states
    this.selectedDeck = null;

    if (this.expandedSetId() === targetSetId) {
      this.expandedSetId.set(null);
      this.setService.unloadWorkspace();
    } else {
      this.expandedSetId.set(targetSetId);
      // 🌟 Centralized Hydra: Atomically spin up the single source of truth workspace snapshot
      this.setService.loadSetWorkspace(targetSetId, entry.set.code);
    }
  }

  public addSet(): void {
    console.log('Spawning Scryfall installation download query modal');
  }

  public deleteSet(set: MtgSet): void {
    if (confirm(`Permanently purge "${set.name}" and all associated user decks from your hard drive?`)) {
      this.setService.uninstall(set)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            if (this.expandedSetId() === set.id) {
              this.expandedSetId.set(null);
              this.selectedDeck = null;
            }
          }
        });
    }
  }

  /**
   * ATOMIC NEW DECK PERSISTENCE COMMAND
   * Assembles a pure, uninstantiated interface object signature and inserts it down the data wire.
   */
  public addDeck(set: MtgSet): void {
    const deckName = prompt('Enter New Custom Deck Name:');
    if (!deckName) return;

    // Build a pure, uninstantiated data interface contract object
    const freshDomainDeck: MtgDeck = {
      id: crypto.randomUUID(), // Secure client-side text string UUID generation
      setId: set.id,
      name: deckName,
      tags: [],
      notes: '',
      cards: new Map<string, number>() // Clear, ready-to-fill assignment dictionary
    };

    // 🌟 DEFER WRITES TO THE BLIND WIRE:
    // Pushes the deck down via DATA_WIRE_TOKEN. On desktop, ElectronDataWire handles SQLite columns
    // serialization and background Outbox log tracking natively under the canopy!
    this.dataWire.insert<typeof decks, MtgDeck, MtgDeck>(decks, freshDomainDeck).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        console.log(`[App] New deck workspace "${deckName}" created successfully.`);
        // Force the SetService context manager to reload, updating activeDecks$ automatically
        this.setService.loadSetWorkspace(set.id, set.code);
      },
      error: (err) => console.error('Failed to create new deck container:', err?.message || err)
    });
  }

  public logout(): void {
    this.setService.unloadWorkspace();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
