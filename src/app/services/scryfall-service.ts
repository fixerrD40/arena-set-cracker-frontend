import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ScryfallCard } from '../models/scryfall-card.model';

@Injectable({
  providedIn: 'root',
})
export class ScryfallService {
  private readonly baseUrl = 'https://api.scryfall.com';

  constructor(private http: HttpClient) {}

  isValidSetCode(code: string): Observable<boolean> {
    return this.http.get(`${this.baseUrl}/sets/${code.toLowerCase()}`).pipe(
      map(() => true),
      catchError((err) => {
        if (err.status === 404) return of(false);
        return throwError(() => new Error('Failed to validate set code'));
      })
    );
  }

  getSetByCode(code: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/sets/${code.toLowerCase()}`);
  }

  getAllSets(): Observable<any> {
    return this.http.get(`${this.baseUrl}/sets`);
  }

  getCardsBySet(code: string): Observable<ScryfallCard[]> {
    const url = `${this.baseUrl}/cards/search?q=set:${code.toLowerCase()}`;
    return this.fetchAllPages(url);
  }

  private fetchAllPages(url: string, accumulated: ScryfallCard[] = []): Observable<ScryfallCard[]> {
    return this.http.get<any>(url).pipe(
      switchMap(response => {
        const combined = [...accumulated, ...response.data as ScryfallCard[]];
        return response.has_more
          ? this.fetchAllPages(response.next_page, combined)
          : of(combined);
      })
    );
  }
}