import { Injectable, inject } from '@angular/core'; // FIXED: Standard native Angular imports (No 'as' aliases!)
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, delay } from 'rxjs/operators';

import { ScryfallCard } from './models/card.scryfall';
import { ScryfallSet } from './models/set.scryfall';

@Injectable({
  providedIn: 'root', // FIXED: Compiler will now generate perfect structural factory entries natively
})
export class ScryfallService {
  private readonly http = inject(HttpClient);

  // FIXED NETWORK ENDPOINT: Appended api. sub-domain to prevent HTTP redirect failures
  private readonly baseUrl = 'https://api.scryfall.com';

  // Scryfall explicitly requests an identifiable User-Agent in their API docs
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Accept': 'application/json',
      'User-Agent': 'MtgVaultApp/1.0.0 (contact@yourdomain.com)'
    })
  };

  /**
   * Verifies if a given set code exists on Scryfall by reusing getSetByCode
   */
  public isValidSetCode(code: string): Observable<boolean> {
    return this.getSetByCode(code).pipe(
      map(() => true),
      catchError((err) => {
        if (err.status === 404) return of(false);
        return throwError(() => new Error(`Failed to validate set code: ${code}`));
      })
    );
  }

  /**
   * Fetches metadata for an individual set using its 3-letter code
   */
  public getSetByCode(code: string): Observable<ScryfallSet> {
    return this.http.get<ScryfallSet>(
      `${this.baseUrl}/sets/${code.toLowerCase()}`,
      this.httpOptions
    );
  }

  /**
   * Pulls down the master printing catalog list and extracts the data array
   * Filters down to non-digital targets matching your offline caching rules
   */
  public getAvailableSets(): Observable<ScryfallSet[]> {
    return this.http.get<{ data: ScryfallSet[] }>(`${this.baseUrl}/sets`, this.httpOptions).pipe(
      map((response) => {
        const setList = response.data || [];
        return setList.filter(set => !set.digital);
      })
    );
  }

  /**
   * Requests all card objects belonging to a targeted set code across all paginated pages
   */
  public getCardsBySet(code: string): Observable<ScryfallCard[]> {
    const url = `${this.baseUrl}/cards/search?q=set:${code.toLowerCase()}+is:arena`;
    return this.fetchAllPages(url);
  }

  /**
   * Recursively handles Scryfall's API pagination data flow, applying a mandatory 100ms rate-limiting delay
   */
  private fetchAllPages(url: string, accumulated: ScryfallCard[] = []): Observable<ScryfallCard[]> {
    return this.http.get<{ has_more: boolean; next_page?: string; data: ScryfallCard[] }>(url, this.httpOptions).pipe(
      switchMap(response => {
        const combined = [...accumulated, ...response.data];

        if (response.has_more && response.next_page) {
          // Add a 100ms pause before triggering the next page download to obey rate limits
          return of(null).pipe(
            delay(100),
            switchMap(() => this.fetchAllPages(response.next_page!, combined))
          );
        }

        return of(combined);
      }),
      catchError((err) => {
        console.error('Failed to parse a paginated page stream chunk:', err?.message || err);
        return throwError(() => err);
      })
    );
  }
}
