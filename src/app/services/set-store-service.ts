import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, switchMap, tap, map } from 'rxjs/operators';

import { Set } from '../models/set';
import { ScryfallSet } from '../models/scryfall-set';
import { SetService } from './set-service';
import { ScryfallService } from './scryfall-service';

@Injectable({
  providedIn: 'root',
})
export class SetStoreService {
  private setsSubject = new BehaviorSubject<Map<number, ScryfallSet>>(new Map());
  sets$ = this.setsSubject.asObservable().pipe(
    map(setMap =>
      Array.from(setMap.entries()).map(([id, set]) => ({ id, set }))
    )
  );

  constructor(
    private setService: SetService,
    private scryfall: ScryfallService
  ) {}

  loadSets(): void {
    this.setService.getAll().pipe(
      switchMap((savedSets: Set[]) =>
        this.scryfall.getAllSets().pipe(
          map((all: { data: ScryfallSet[] }) => {
            const map = new Map<number, ScryfallSet>();
            for (const saved of savedSets) {
              const scryfallSet = all.data.find(
                ss => ss.code.toLowerCase() === saved.code.toLowerCase()
              );
              if (scryfallSet && saved.id != null) {
                map.set(saved.id, scryfallSet);
              }
            }
            return map;
          })
        )
      ),
      tap((setMap: Map<number, ScryfallSet>) => this.setsSubject.next(setMap)),
      catchError(err => {
        console.error('Failed to load sets:', err.message);
        return of(new Map());
      })
    ).subscribe();
  }

  addSet(newSet: Set): void {
    this.scryfall.isValidSetCode(newSet.code).pipe(
      switchMap(isValid => {
        if (!isValid) {
          return throwError(() => new Error('Invalid set code.'));
        }
        return forkJoin([
          this.setService.create(newSet),
          this.scryfall.getSetByCode(newSet.code)
        ]);
      }),
      tap(([createdSet, scryfallSet]) => {
        const currentMap = new Map(this.setsSubject.getValue());
        if (createdSet.id != null) {
          currentMap.set(createdSet.id, scryfallSet);
          this.setsSubject.next(currentMap);
        }
      }),
      catchError(err => {
        console.error('Failed to add set:', err.message);
        return of();
      })
    ).subscribe();
  }

  deleteSet(id: number): void {
    this.setService.delete(id).subscribe(() => {
      const currentMap = new Map(this.setsSubject.getValue());
      currentMap.delete(id);
      this.setsSubject.next(currentMap);
    });
  }

  get currentSets(): ScryfallSet[] {
    return Array.from(this.setsSubject.getValue().values());
  }

  clear(): void {
    this.setsSubject.next(new Map());
  }
}