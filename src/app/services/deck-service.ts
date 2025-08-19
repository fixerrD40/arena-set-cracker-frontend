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

  getDecksBySet(setId: number): Observable<Deck[]> {
    const url = `${this.apiUrl}/${setId}`;
    return this.http.get<Deck[]>(url, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  createWithSet(setId: number, deck: Deck): Observable<Deck> {
    const url = `${this.apiUrl}/${setId}`;
    return this.http.post<Deck>(url, deck, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }
}