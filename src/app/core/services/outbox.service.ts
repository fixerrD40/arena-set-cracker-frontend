// src/app/core/services/persistence/outbox.service.ts
import { inject, Injectable } from '@angular/core';
import { Observable, of, defer, Subscription, merge, fromEvent, EMPTY, from } from 'rxjs';
import { map, switchMap, tap, catchError, exhaustMap } from 'rxjs/operators';

// Infrastructure & Authentication Dependencies
import { AuthService } from './auth.service';
import { BackendService } from './backend.service';
import { SqliteEngine } from '../storage/sqlite/sqlite.engine';

// Drizzle Schema Mapping Constants
import { syncQueue, SyncQueueRow } from '../storage/sqlite/sqlite.schema';
import { and, eq, sql } from 'drizzle-orm';

export type SyncQueueItem = typeof syncQueue.$inferSelect;

@Injectable({
  providedIn: 'root',
})
export class OutboxService {
  private readonly auth = inject(AuthService);
  private readonly sqliteEngine = inject(SqliteEngine);
  private readonly backend = inject(BackendService); // Injected Backend Gateway Instance

  private activeSyncSubscription?: Subscription;
  private engineInitialized = false;

  constructor() {}

  // ==========================================================
  // CORE STORAGE RUNTIME LIFECYCLE INITIALIZER
  // ==========================================================

  /**
   * Called inside PHASE 3 of your ConfigInitializer sequence.
   * Completely stateless: No caching, no lookups. Just boots the network sync stream tracker.
   */
  public initializeEngine(): void {
    if (this.engineInitialized) return;
    this.engineInitialized = true;

    merge(of(null), fromEvent(window, 'online')).pipe(
      exhaustMap(() => {
        if (!this.auth.isAuthenticated()) return EMPTY;
        console.log('[OutboxService] Online signal detected. Initiating upload pipeline sync...');
        return this.executeBulkSyncPipelineStream();
      }),
      catchError((err) => {
        console.error('[OutboxService] Critical outbox background stream failure:', err);
        return EMPTY;
      })
    ).subscribe();
  }

  /**
   * Triggers a manual outbox synchronization pass.
   */
  public triggerOutboxSync(): void {
    if (this.activeSyncSubscription && !this.activeSyncSubscription.closed) {
      console.warn('[OutboxService] Sync process currently active. Trigger skipped.');
      return;
    }
    this.activeSyncSubscription = this.executeBulkSyncPipelineStream().subscribe();
  }

  /**
   * ATOMIC BANDWIDTH SQUASHING ENBOX
   * Writes synchronization frames using native SQLite conflict resolution indices
   * to collapse repetitive offline data modifications into a single network footprint.
   */
  public enqueue(item: {
    entityType: 'set' | 'deck';
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    payload: any
  }): Observable<void> {
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) {
      console.warn('[OutboxService] SQLite database instance uninitialized.');
      return of(void 0);
    }

    const payloadId = String(item.payload?.id);

    try {
      // 🌟 PERFORMANCE OPTIMIZATION 1: BANDWIDTH CLEANUP
      // If deleting an entity, clear any trailing CREATE/UPDATE traces out of the queue first
      if (item.action === 'DELETE') {
        const clearQuery = db
          .delete(syncQueue)
          .where(
            and(
              eq(syncQueue.entityType, item.entityType),
              // Leverages Drizzle's type-safe sql operator to safely check the JSON index layout
              sql`json_extract(${syncQueue.payload}, '$.id') = ${payloadId}`
            )
          )
          .toSQL();

        db.run(clearQuery.sql, clearQuery.params);
      }

      // 🌟 PERFORMANCE OPTIMIZATION 2: ATOMIC UPSERT SQUASHING
      // If a record conflict occurs on your index, overwrite the payload and advance the timestamp
      const insertQuery = db
        .insert(syncQueue)
        .values({
          entityType: item.entityType,
          action: item.action,
          payload: item.payload
        })
        .onConflictDoUpdate({
          // Target your unique composite index constraint configuration explicitly
          target: [syncQueue.entityType, sql`json_extract(${syncQueue.payload}, '$.id')`],
          set: {
            action: sql`excluded.action`,
            payload: sql`excluded.payload`,
            createdAt: sql`excluded.created_at`
          }
        })
        .toSQL();

      db.run(insertQuery.sql, insertQuery.params);

      this.sqliteEngine.flush();

      // Optimistically trigger background streaming if connection state allows
      if (navigator.onLine && this.auth.isAuthenticated()) {
        this.triggerOutboxSync();
      }

      return of(void 0);
    } catch (err) {
      console.error('[OutboxService] Native database upsert block failure:', err);
      return of(void 0);
    }
  }

  /**
   * HIGH-PERFORMANCE DATA TRANSMISSION LOG PIPELINE
   * Compiles the local database transaction ledger, pipes records to the server via NDJSON,
   * and purges the synced items from the disk safely.
   */
  public executeBulkSyncPipelineStream(): Observable<void> {
    if (!this.auth.isAuthenticated()) {
      return of(void 0);
    }

    return defer(() => {
      const db = this.sqliteEngine.cachedDbInstance;
      if (!db) {
        console.warn('[OutboxService] Sync aborted: Database engine uninitialized.');
        return of(void 0);
      }

      const syncedIds: number[] = [];

      // 🌟 CENTRALIZED TYPE ASSIGNMENT: Cleanly cast driver cursor results using the unified row type
      const rawRecords = db.select().from(syncQueue).orderBy(syncQueue.id).all() as SyncQueueRow[];

      // Convert your native driver array into a strongly-typed, low-overhead RxJS stream
      const outboxDataStream$: Observable<SyncQueueRow> = from(rawRecords).pipe(
        map((queueItem: SyncQueueRow) => {
          // The compiler perfectly understands queueItem.payload exists and is type-safe
          const resolvedPayload = typeof queueItem.payload === 'string'
            ? JSON.parse(queueItem.payload)
            : queueItem.payload;

          return { ...queueItem, payload: resolvedPayload };
        }),
        tap((item) => syncedIds.push(item.id))
      );

      // Route the streaming cursor dataset through your BackendService network client wrapper (NDJSON)
      return this.backend.streamJsonRecordsToServer(outboxDataStream$, 'outbox/bulk-sync').pipe(
        switchMap(() => {
          if (syncedIds.length === 0) return of(void 0);

          // Atomic Purge Block: Delete successfully synchronized logs from the SQLite file
          const idsList = syncedIds.join(',');
          db.run(`DELETE FROM sync_queue WHERE id IN (${idsList})`);

          this.sqliteEngine.flush();
          return of(void 0);
        }),
        tap(() => {
          console.log(`[OutboxService] Bulk sync completed. Purged ${syncedIds.length} local records.`);
        }),
        map(() => void 0),
        catchError((err) => {
          console.error('[OutboxService] Network sync transfer aborted.', err);
          throw err;
        })
      );
    });
  }
}
