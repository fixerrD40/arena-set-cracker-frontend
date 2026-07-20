import { inject, Injectable } from '@angular/core';
import { SqliteService } from '../sqlite/sqlite.service';
import { decks, deckCards, DeckEntity } from '../sqlite/sqlite.schema';
import { OutboxService } from './outbox.service';
import { MtgDeck } from '../../shared/models/deck';
import { BehaviorSubject, catchError, map, Observable, of, Subscription, switchMap, tap } from 'rxjs';
import { eq } from 'drizzle-orm';

@Injectable({
  providedIn: 'root'
})
export class DeckService extends SqliteService<DeckEntity, MtgDeck> {
  private readonly outbox = inject(OutboxService);
  private loadSubscription?: Subscription;

  // The local reactive state container for your UI
  private activeDecksSubject = new BehaviorSubject<MtgDeck[]>([]);
  readonly activeDecks$: Observable<MtgDeck[]> = this.activeDecksSubject.asObservable();

  constructor() {
    super(decks, {
      toDomain: (entity) => MtgDeck.fromSqlite(entity),
      fromDomain: (domain) => domain.toSqlite()
    });
  }

  /**
   * ATOMIC MATRIX LOAD: Pulls all decks and their entire nested collection of card quantities
   * assigned to this target set context using a consolidated left-join query compilation strategy.
   */
  loadDecksForSet(localSetId: string): void {
    this.loadSubscription?.unsubscribe();

    // Compile the explicit left join into standard SQLite SQL string arrays
    const compiled = this.builder
      .select({
        deckId: decks.id,
        setName: decks.name,
        setId: decks.setId,
        notes: decks.notes,
        tags: decks.tags,
        createdAt: decks.createdAt,
        cardId: deckCards.cardId,
        quantity: deckCards.quantity
      })
      .from(decks)
      .leftJoin(deckCards, eq(decks.id, deckCards.deckId))
      .where(eq(decks.id, localSetId))
      .toSQL();

    this.loadSubscription = this.executeRawSelect<any>(compiled).pipe(
      // Aggregate the raw flat join rows into distinct deck entities with card lists
      map((rows) => {
        const deckMap = new Map<string, { deckEntity: any; cards: any[] }>();

        for (const row of rows) {
          if (!deckMap.has(row.deckId)) {
            deckMap.set(row.deckId, {
              deckEntity: {
                id: row.deckId,
                name: row.setName,
                setId: row.setId,
                notes: row.notes,
                tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
                createdAt: row.createdAt
              },
              cards: []
            });
          }

          if (row.cardId) {
            deckMap.get(row.deckId)!.cards.push({
              cardId: row.cardId,
              quantity: row.quantity
            });
          }
        }

        return Array.from(deckMap.values()).map(({ deckEntity, cards }) =>
          MtgDeck.fromSqlite(deckEntity, cards)
        );
      }),
      tap((hydratedMatrix) => this.activeDecksSubject.next(hydratedMatrix)),
      catchError((err) => {
        console.error(`Failed to stitch relational deck components for set ${localSetId}:`, err?.message || err);
        this.activeDecksSubject.next([]);
        return of([]);
      })
    ).subscribe();
  }

  unloadAssignmentWorkspace(): void {
    this.loadSubscription?.unsubscribe();
    this.activeDecksSubject.next([]);
  }

  // ========================================================
  // PERSISTENCE MUTATIONS (Keeps your active Matrix updated)
  // ========================================================

  override update(id: string, deck: MtgDeck): Observable<MtgDeck> {
    return super.update(id, deck).pipe(
      switchMap(updatedDeck => {
        const outboxPayload = deck.toJSON();

        // FIXED: Remove the top-level 'id' property. The payload wrapper encapsulates the target record state.
        return this.outbox.enqueue({
          entityType: 'deck',
          action: 'UPDATE',
          payload: outboxPayload // The payload already encapsulates String(deck.id) internally via toJSON()
        }).pipe(map(() => updatedDeck));
      }),
      tap((updatedDeck) => {
        const currentMatrix = this.activeDecksSubject.getValue();
        const updatedMatrix = currentMatrix.map(d => d.id === updatedDeck.id ? updatedDeck : d);
        this.activeDecksSubject.next(updatedMatrix);
      })
    );
  }

  override create(deck: MtgDeck): Observable<MtgDeck> {
    return super.create(deck).pipe(
      switchMap(insertedDeck => {
        const outboxPayload = deck.toJSON();

        // FIXED: Remove the top-level 'id' property. Let the database engine allocate the queue auto-increment key.
        return this.outbox.enqueue({
          entityType: 'deck',
          action: 'CREATE',
          payload: outboxPayload
        }).pipe(map(() => insertedDeck));
      }),
      tap((newDeck: MtgDeck) => {
        const currentMatrix = this.activeDecksSubject.getValue();
        this.activeDecksSubject.next([...currentMatrix, newDeck]);
      })
    );
  }

  override delete(id: string): Observable<void> {
    return super.delete(id).pipe(
      switchMap(() => {
        // FIXED: The record index stringification happens cleanly inside the payload object
        return this.outbox.enqueue({
          entityType: 'deck',
          action: 'DELETE',
          payload: { id: String(id) } // Strictly pass the identifier here to track the server eviction
        }).pipe(map(() => undefined));
      }),
      tap(() => {
        const currentMatrix = this.activeDecksSubject.getValue();
        const updatedMatrix = currentMatrix.filter(d => String(d.id) !== String(id));
        this.activeDecksSubject.next(updatedMatrix);
      })
    );
  }
}
