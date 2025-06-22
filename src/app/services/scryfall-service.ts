import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
}