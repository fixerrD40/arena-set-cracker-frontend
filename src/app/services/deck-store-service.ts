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

  loadForSet(setCode: string) {
    this.deckService.getDecksBySet(setCode).subscribe({
      next: decks => this.decksSubject.next(decks),
      error: err => {
        console.error('Failed to load decks for set', setCode, err);
        this.decksSubject.next([]); // Clear if error to keep UI sane
      }
    });
  }

  addDeck(deck: Deck, setCode: string) {
    return this.deckService.createWithSet(deck, setCode).pipe(
      tap(createdDeck => {
        const current = this.decksSubject.value;
        this.decksSubject.next([...current, createdDeck]);
      })
    );
  }

  updateDeck(deck: Deck, setCode: string) {
    if (!deck.id) throw new Error('Deck ID is required to update');

    return this.deckService.updateWithSet(deck, setCode).pipe(
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