// src/app/core/services/persistence/outbox.service.ts
import { inject, Injectable } from '@angular/core';
import { Observable, of, Subscription, merge, fromEvent, EMPTY, from, defer } from 'rxjs';
import { map, switchMap, tap, catchError, exhaustMap } from 'rxjs/operators';

// Infrastructure & Authentication Dependencies
import { AuthService } from './auth.service';
import { BackendService } from './backend.service';
import { SqliteEngine } from '../storage/sqlite/sqlite.engine';

// Drizzle Schema Mapping Constants & Relational Operators
import { syncQueue, SyncQueueRow } from '../storage/sqlite/sqlite.schema';
import { and, eq, inArray } from 'drizzle-orm'; // 🌟 CLEAN IMPORT: Added 'inArray' here!

export type SyncQueueItem = typeof syncQueue.$inferSelect;

@Injectable({
  providedIn: 'root',
})
export class OutboxService {
  private readonly auth = inject(AuthService);
  private readonly sqliteEngine = inject(SqliteEngine);
  private readonly backend = inject(BackendService);

  private activeSyncSubscription?: Subscription;
  private engineInitialized = false;

  constructor() {}

  // ==========================================================
  // CORE STORAGE RUNTIME LIFECYCLE INITIALIZER
  // ==========================================================

  /**
   * Called inside PHASE 3 of your ConfigInitializer sequence.
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

  // ==========================================================
  // ATOMIC BANDWIDTH SQUASHING ENBOX
  // ==========================================================

  /**
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
    if (!payloadId) {
      console.error('[OutboxService] Enqueue aborted: Payload lacks a valid unique identifier "id".');
      return of(void 0);
    }

    try {
      // PERFORMANCE OPTIMIZATION 1: BANDWIDTH CLEANUP
      if (item.action === 'DELETE') {
        db.delete(syncQueue)
          .where(
            and(
              eq(syncQueue.entityType, item.entityType),
              eq(syncQueue.entityId, payloadId)
            )
          )
          .run();
      }

      // PERFORMANCE OPTIMIZATION 2: ATOMIC UPSERT SQUASHING
      db.insert(syncQueue)
        .values({
          entityType: item.entityType,
          entityId: payloadId,
          action: item.action,
          payload: item.payload
        })
        .onConflictDoUpdate({
          target: [syncQueue.entityType, syncQueue.entityId],
          set: {
            action: item.action,
            payload: item.payload,
            createdAt: new Date().toISOString()
          }
        })
        .run();

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

  // ==========================================================
  // HIGH-PERFORMANCE DATA TRANSMISSION LOG PIPELINE
  // ==========================================================

  /**
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

      // Fetch pending sync items sorted chronologically by ID layout
      const rawRecords = db.select().from(syncQueue).orderBy(syncQueue.id).all() as SyncQueueRow[];

      if (rawRecords.length === 0) {
        console.log('[OutboxService] Outbox log queue empty. System fully synchronized.');
        return of(void 0);
      }

      // Track the exact snapshot IDs being processed in this specific stream batch
      const targetBatchIds = rawRecords.map(r => r.id);

      // Convert your native driver array into a strongly-typed, low-overhead RxJS stream
      const outboxDataStream$: Observable<SyncQueueRow> = from(rawRecords).pipe(
        map((queueItem: SyncQueueRow) => {
          const resolvedPayload = typeof queueItem.payload === 'string'
            ? JSON.parse(queueItem.payload)
            : queueItem.payload;

          return {
            ...queueItem,
            payload: resolvedPayload
          };
        })
      );

      console.log(`[OutboxService] Piping ${targetBatchIds.length} NDJSON logs down the sync wire channel...`);

      // Route the streaming dataset through your BackendService network client wrapper
      return this.backend.streamJsonRecordsToServer(outboxDataStream$, 'outbox/bulk-sync').pipe(
        switchMap(() => {
          if (targetBatchIds.length === 0) return of(void 0);

          // Type-safe, Drizzle-compliant Atomic Purge Block using static 'inArray' import
          db.delete(syncQueue)
            .where(inArray(syncQueue.id, targetBatchIds))
            .run();

          this.sqliteEngine.flush();
          return of(void 0);
        }),
        tap(() => {
          console.log(`[OutboxService] Bulk sync completed. Purged ${targetBatchIds.length} local records.`);
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
