import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { Deck } from '../models/deck';
import { DeckService } from './deck-service';
import { ScryfallSet } from '../models/scryfall-set';

@Injectable({
  providedIn: 'root',
})
export class DeckStoreService {
  private decksSubject = new BehaviorSubject<Deck[]>([]);
  public decks$: Observable<Deck[]> = this.decksSubject.asObservable();

  constructor(private deckService: DeckService) {}

  loadForSet(entry: { id: number; scryfallSet: ScryfallSet }) {
    this.deckService.getDecksBySet(entry.id).subscribe({
      next: rawDecks => {
        const parsedDecks: Deck[] = [];

        for (const raw of rawDecks) {
          const deck = new Deck(raw);
          parsedDecks.push(deck);
        }

        this.decksSubject.next(parsedDecks);
      },
      error: err => {
        console.error('Failed to load decks for set', entry.id, err);
        this.decksSubject.next([]);
      }
    });
  }

  addDeck(set: { id: number; scryfallSet: ScryfallSet }, deck: Deck) {
    return this.deckService.createWithSet(set.id, deck).pipe(
      tap(rawDeck => {
        const deckInstance = new Deck(rawDeck);
        const current = this.decksSubject.value;
        this.decksSubject.next([...current, deckInstance]);
      })
    );
  }

  updateDeck(deck: Deck,) {
    if (!deck.id) throw new Error('Deck ID is required to update');

    return this.deckService.update(deck.id, deck).pipe(
      tap(updatedDeck => {
        const current = this.decksSubject.value;
        const index = current.findIndex(d => d.id === updatedDeck.id);
        if (index !== -1) {
          const updated = [...current];
          updated[index] = updatedDeck;
          this.decksSubject.next(updated);
        }
      })
    );
  }

  deleteDeck(id: number) {
    return this.deckService.delete(id).pipe(
      tap(() => {
        const current = this.decksSubject.value;
        this.decksSubject.next(current.filter(d => d.id !== id));
      })
    );
  }

  getDeckById(id: number): Deck | undefined {
    return this.decksSubject.value.find(d => d.id === id);
  }

  clear() {
    this.decksSubject.next([]);
  }
}