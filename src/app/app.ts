import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Navbar } from './components/navbar/navbar';
import { map, Observable } from 'rxjs';

import { SetStoreService } from './services/set-store-service';
import { ScryfallSet } from './models/scryfall-set';
import { DeckStoreService } from './services/deck-store-service';

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
    Navbar,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  title = 'arena-set-cracker';
  isShowing = false;

  sets$: Observable<{ id: number; set: ScryfallSet }[]>;
  decks: string[] = [];
  expandedSet: number | null = null;

  constructor(
    private setStore: SetStoreService,
    private deckStore: DeckStoreService,
    private router: Router
  ) {
    this.sets$ = this.setStore.sets$;
    this.deckStore.decks$.subscribe(decks => {
      this.decks = decks.map(d => d.name);
    });
  }

  toggleSet(id: number): void {
    const isExpanding = this.expandedSet !== id;
    this.expandedSet = isExpanding ? id : null;

    if (isExpanding) {
      this.deckStore.loadForSet(id);
    }
  }

  deleteSet(id: number): void {
    this.setStore.deleteSet(id);
  }

  addSet() {
    this.router.navigate(['/add-set']);
  }

  addDeck(entry: { id: number; set: ScryfallSet }) {
    this.router.navigate(['/add-deck'], {
      state: { entry }
    });
  }

  isExpanded(id: number): boolean {
    return this.expandedSet === id;
  }

  toggleSidenav(): void {
    this.isShowing = !this.isShowing;
  }
}
