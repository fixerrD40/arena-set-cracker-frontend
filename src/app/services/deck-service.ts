import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { CrudService } from './crud-service';
import { Deck } from '../models/deck';
import { catchError, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DeckService extends CrudService<Deck> {
  constructor(http: HttpClient, @Inject('APP_CONFIG') config: any) {
    super(http, config, 'decks');
  }

  getDecksBySet(set: number): Observable<Deck[]> {
    return this.getAll({ 'X-Set': set.toString() });
  }

  createWithSet(deck: Deck, setId: number): Observable<Deck> {
    return this.create(deck, { 'X-Set': setId.toString() });
  }

  updateWithSet(deck: Deck, setId: number): Observable<Deck> {
    if (!deck.id) {
      throw new Error('Deck must have an ID to be updated.');
    }
    return this.update(deck.id, deck, { 'X-Set': setId.toString() });
  }

}