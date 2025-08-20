import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of, tap } from 'rxjs';
import { ScryfallService } from './scryfall-service';
import { ScryfallCard } from '../models/scryfall-card.model';

@Injectable({ providedIn: 'root' })
export class CardStoreService {
  private readonly memoryCache = new Map<string, ScryfallCard[]>();
  private currentSetCode: string | null = null;
  private currentSetCards$ = new BehaviorSubject<ScryfallCard[] | null>(null);

  constructor(private scryfall: ScryfallService) {}

  loadSet(setCode: string): Observable<ScryfallCard[]> {
    if (this.currentSetCode === setCode && this.currentSetCards$.value) {
      return this.currentSetCards$.pipe(
        map(cards => cards ?? [])
      );
    }

    // Check in-memory
    if (this.memoryCache.has(setCode)) {
      const cards = this.memoryCache.get(setCode)!;
      this.currentSetCode = setCode;
      this.currentSetCards$.next(cards);
      return of(cards);
    }

    // Check localStorage
    const local = localStorage.getItem(`set-${setCode}`);
    if (local) {
      const cards = JSON.parse(local);
      this.memoryCache.set(setCode, cards);
      this.currentSetCode = setCode;
      this.currentSetCards$.next(cards);
      return of(cards);
    }

    // Fetch from Scryfall
    return this.scryfall.getCardsBySet(setCode).pipe(
      tap(cards => {
        this.memoryCache.set(setCode, cards);
        localStorage.setItem(`set-${setCode}`, JSON.stringify(cards));
        this.currentSetCode = setCode;
        this.currentSetCards$.next(cards);
      })
    );
  }

  getCurrentSetCards(): Observable<ScryfallCard[]> {
    return this.currentSetCards$.pipe(
      map(cards => cards ?? [])
    );
  }

  clearCache(setCode?: string): void {
    if (setCode) {
      this.memoryCache.delete(setCode);
      localStorage.removeItem(`set-${setCode}`);
    } else {
      this.memoryCache.clear();
      Object.keys(localStorage)
        .filter(k => k.startsWith('set-'))
        .forEach(k => localStorage.removeItem(k));
    }
  }
}
