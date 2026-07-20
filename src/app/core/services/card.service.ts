import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { SqliteService } from '../sqlite/sqlite.service';
import { cards, CardEntity } from '../sqlite/sqlite.schema';
import { MtgCard } from '../../shared/models/card';
import { eq } from 'drizzle-orm';

@Injectable({ providedIn: 'root' })
export class CardService extends SqliteService<CardEntity, MtgCard> {
  private currentSetId: string = "";
  private activeLoadSubscription?: Subscription;

  // 1. Core State: Holds the array of domain cards for ONLY the active screen context
  private activeCardsSubject = new BehaviorSubject<MtgCard[]>([]);

  // 2. Public Stream: The single source of truth for grid/deckbuilder components to bind to
  readonly activeCards$: Observable<MtgCard[]> = this.activeCardsSubject.asObservable();

  constructor() {
    super(cards, {
      toDomain: (entity) => MtgCard.fromSqlite(entity),
      fromDomain: (domain) => domain.toSqlite()
    });
  }

  /**
   * Loads a single set's cards into browser memory from the local SQLite database.
   * Instantly unloads any previously loaded set to save memory.
   *
   * @param localSetId The primary key string from your local cards database table
   */
  loadSet(localSetId: string): void {
    // 1. Cancel any active database queries to prevent async race conditions
    this.activeLoadSubscription?.unsubscribe();

    // 2. Guard Clause: If this specific set is already in RAM, keep it and do nothing
    if (this.currentSetId === localSetId) {
      return;
    }

    this.currentSetId = localSetId;

    // 3. Query the local SQLite driver layer using our explicit Drizzle compiler method
    this.activeLoadSubscription = this.getCardsBySetIdFromSqlite(localSetId).pipe(
      tap((domainCards: MtgCard[]) => {
        this.activeCardsSubject.next(domainCards);
      }),
      catchError(err => {
        console.error(`Failed to isolate local SQLite cards for set ID ${localSetId}:`, err?.message || err);
        this.unloadCards();
        return of([]);
      })
    ).subscribe();
  }

  /**
   * Explicitly flushes cards out of browser RAM.
   * Call this when navigating completely out of a card grid view.
   */
  unloadCards(): void {
    this.activeLoadSubscription?.unsubscribe();
    this.currentSetId = "";
    this.activeCardsSubject.next([]); // Triggers immediate JavaScript garbage collection
  }

  /**
   * Safe clean down hook matching SetService implementation signatures
   */
  unloadSetFromMemory(localSetId: string): void {
    if (this.currentSetId === localSetId) {
      this.unloadCards();
    }
  }

  // --- Fast Synchronous Helpers ---

  public get snapshotOfActiveCards(): MtgCard[] {
    return this.activeCardsSubject.getValue();
  }

  public get activeSetId(): string {
    return this.currentSetId;
  }

  /**
   * Internal query fetcher that maps raw database results into domain models
   * REFACTORED: Replaces manual raw string queries with the headless Drizzle string generator
   */
  private getCardsBySetIdFromSqlite(setId: string): Observable<MtgCard[]> {
    // 1. Use the headless builder to compile the selection statement safely from schema objects
    const compiled = this.builder
      .select()
      .from(cards)
      .where(eq(cards.setId, setId))
      .toSQL();

    // 2. Feed the compiled query directly into the base class custom runner utility
    return this.executeRawSelect<CardEntity>(compiled).pipe(
      // 3. Map the raw database entities directly using your unified class mapper setup
      map((entities) => entities.map((entity) => this.mapper.toDomain(entity)))
    );
  }
}
