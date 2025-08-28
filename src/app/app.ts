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
import { CardStoreService } from './services/card-store-service';
import { Color, ColorDisplayNames, ColorIdentity } from './models/color';

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

  sets$: Observable<{ id: number; scryfallSet: ScryfallSet }[]>;
  decks: Deck[] = [];
  expandedSet: number | null = null;

  constructor(
    private authService: AuthService,
    private setStore: SetStoreService,
    private deckStore: DeckStoreService,
    private cardStore: CardStoreService,
    private router: Router
  ) {
    this.sets$ = this.setStore.sets$;
    this.deckStore.decks$.subscribe(decks => {
      this.decks = decks;
    });

    this.authService.username$.subscribe((username: any) => {
      if (username) {
        this.expandedSet = null;
        this.setStore.loadSets();
      } else {
        this.setStore.clear();
        this.deckStore.clear();
      }
    });
  }

  getColorIconPaths(identity: ColorIdentity): string[] {
    if (!identity) return [];

    const colors = [...identity.colors];
    const primaryIndex = colors.indexOf(identity.primary);

    if (primaryIndex !== -1) {
      colors.splice(primaryIndex, 1);
      colors.unshift(identity.primary);
    }

    return colors.map((color) => {
      const filename = ColorDisplayNames[color].toLowerCase();
      return `assets/colors/${filename}.png`;
    });
  }


  toggleSet(entry: { id: number; scryfallSet: ScryfallSet }): void {
    if (this.expandedSet === entry.id) {
      this.router.navigate(['/set', entry.id]);
      return;
    }

    this.expandedSet = entry.id;
    this.deckStore.loadForSet(entry);
    this.cardStore.loadSet(entry.scryfallSet.code).subscribe();
    this.router.navigate(['/set', entry.id]);
  }

  deleteSet(id: number): void {
    this.setStore.deleteSet(id);
  }

  addSet() {
    this.router.navigate(['/add-set']);
  }

  addDeck(set: { id: number; scryfallSet: ScryfallSet }) {
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
