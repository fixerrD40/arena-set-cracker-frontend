import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { Deck } from '../models/deck';
import { DeckService } from './deck-service';

@Injectable({
  providedIn: 'root',
})
export class DeckStoreService {
  private decksSubject = new BehaviorSubject<Deck[]>([]);
  public decks$: Observable<Deck[]> = this.decksSubject.asObservable();

  constructor(private deckService: DeckService) {}

  loadForSet(id: number) {
    this.deckService.getDecksBySet(id).subscribe({
      next: decks => this.decksSubject.next(decks),
      error: err => {
        console.error('Failed to load decks for set', id, err);
        this.decksSubject.next([]);
      }
    });
  }

  addDeck(set: number, deck: Deck) {
    return this.deckService.createWithSet(deck, set).pipe(
      tap(createdDeck => {
        const current = this.decksSubject.value;
        this.decksSubject.next([...current, createdDeck]);
      })
    );
  }

  updateDeck(set: number, deck: Deck,) {
    if (!deck.id) throw new Error('Deck ID is required to update');

    return this.deckService.updateWithSet(deck, set).pipe(
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
}