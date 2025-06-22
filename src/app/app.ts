import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Navbar } from './components/navbar/navbar';
import { map, Observable } from 'rxjs';

import { SetStoreService } from './services/set-store-service';
import { ScryfallSet } from './models/scryfall-set';

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
  expandedSet: string | null = null;

  constructor(private setStore: SetStoreService) {
    this.sets$ = this.setStore.sets$;
  }

  toggleSet(setCode: string): void {
    const isExpanding = this.expandedSet !== setCode;
    this.expandedSet = isExpanding ? setCode : null;

    this.decks = ['Frodo Deck', 'Gandalf Deck'];
  }

  deleteSet(id: number): void {
    this.setStore.deleteSet(id);
  }

  isExpanded(setCode: string): boolean {
    return this.expandedSet === setCode;
  }

  toggleSidenav(): void {
    this.isShowing = !this.isShowing;
  }
}
