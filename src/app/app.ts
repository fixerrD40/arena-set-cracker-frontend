import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Observable } from 'rxjs';

import { AuthService } from './services/auth-service';
import { SetStoreService } from './services/set-store-service';
import { ScryfallSet } from './models/scryfall-set';
import { DeckStoreService } from './services/deck-store-service';
import { Navbar } from './components/layout/navbar/navbar';
import { Deck } from './models/deck';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    RouterModule,
    MatToolbarModule,
    Navbar
],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  title = 'arena-set-cracker';
  isShowing = false;

  sets$: Observable<{ id: number; set: ScryfallSet }[]>;
  decks: Deck[] = [];
  expandedSet: number | null = null;

  constructor(
    private authService: AuthService,
    private setStore: SetStoreService,
    private deckStore: DeckStoreService,
    private router: Router
  ) {
    this.sets$ = this.setStore.sets$;
    this.deckStore.decks$.subscribe(decks => {
      this.decks = decks;
    });

    this.authService.username$.subscribe((username: any) => {
      if (username) {
        this.setStore.loadSets();
      } else {
        this.setStore.clear();
        this.deckStore.clear();
      }
    });
  }

  toggleSet(entry: { id: number; set: ScryfallSet }): void {
    const isExpanding = this.expandedSet !== entry.id;
    this.expandedSet = isExpanding ? entry.id : null;

    if (isExpanding) {
      this.deckStore.loadForSet(entry);
      
    }
  }

  deleteSet(id: number): void {
    this.setStore.deleteSet(id);
  }

  addSet() {
    this.router.navigate(['/add-set']);
  }

  addDeck(set: { id: number; set: ScryfallSet }) {
    this.router.navigate(['/add-deck'], {
      state: { set }
    });
  }

  isExpanded(id: number): boolean {
    return this.expandedSet === id;
  }

  toggleSidenav(): void {
    this.isShowing = !this.isShowing;
  }
}
