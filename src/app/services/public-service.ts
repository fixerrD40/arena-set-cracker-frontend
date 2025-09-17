import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Deck, parseDeck } from '../models/deck';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Set } from '../models/set';
import { Recommendations } from '../models/recommendations';

@Injectable({
  providedIn: 'root',
})
export class PublicService {
  private readonly baseUrl;

  constructor(private http: HttpClient, @Inject('APP_CONFIG') config: any) {
    this.baseUrl = `${config.baseUrl}/public`;
  }

  getSets(): Observable<Set[]> {
    return this.http.get<Set[]>(`${this.baseUrl}/sets`).pipe(
      catchError(this.handleError)
    );
  }

  getDecks(setId: number): Observable<Deck[]> {
    return this.http.get<any[]>(`${this.baseUrl}/decks/${setId}`).pipe(
      map(rawDecks => rawDecks.map(d => parseDeck(d))),
      catchError(this.handleError)
    );
  }

  getRecommendations(deckId: number): Observable<Recommendations> {
    return this.http.post<Recommendations>(`${this.baseUrl}/recommend/deck/${deckId}`, {}).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      errorMessage = `Server-side error: ${error.status} ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
