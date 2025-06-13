import { Component, ViewChild } from '@angular/core';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { RouterOutlet } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';

import { Navbar } from './components/navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatSidenav,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    RouterOutlet,
    MatToolbar,
    Navbar
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected title = 'arena-set-cracker';
  isShowing: boolean = false;
  sets: string[] = ['The Lord of the Rings: Tales of Middle-earth', 'Final Fantasy'];
  setsDecks = new Map<string, string[]>([
    ['The Lord of the Rings: Tales of Middle-earth', ['Frodo Deck', 'Gandalf Deck']],
    ['Final Fantasy', ['Cloud Deck', 'Sephiroth Deck']]
  ]);

  expandedSet: string | null = null;

  get setsDeckEntries() {
    return Array.from(this.setsDecks.entries()).map(([name, decks]) => ({
      name,
      decks
    }));
  }

  toggleSet(name: string): void {
    this.expandedSet = this.expandedSet === name ? null : name;
  }

  isExpanded(name: string): boolean {
    return this.expandedSet === name;
  }

  toggleSidenav() {
    this.isShowing = !this.isShowing;
  }
}