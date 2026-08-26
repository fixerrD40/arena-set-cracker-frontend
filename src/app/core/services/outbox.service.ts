import { Injectable, inject } from '@angular/core';
import { merge, of, fromEvent, EMPTY, Subscription, Observable, defer, from } from 'rxjs';
import { exhaustMap, catchError, map, switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { BackendService } from './backend.service';
import { SQLITE_ENGINE_TOKEN, OutboxEnvelope } from '../sqlite/sqlite.engine';
import { SyncQueueRow } from '../sqlite/sqlite.schema';

@Injectable({
  providedIn: 'root',
})
export class OutboxService {
  private readonly auth = inject(AuthService);
  private readonly sqlite = inject(SQLITE_ENGINE_TOKEN);
  private readonly backend = inject(BackendService);

  private activeSyncSubscription?: Subscription;
  private engineInitialized = false;

  public initializeEngine(): void {
    if (this.engineInitialized) return;
    this.engineInitialized = true;

    merge(of(null), fromEvent(window, 'online')).pipe(
      exhaustMap(() => {
        if (!this.auth.isAuthenticated()) return EMPTY;
        console.log('[OutboxService] Network online state verified. Commencing background sync...');
        return this.executeBulkSyncPipelineStream();
      }),
      catchError((err) => {
        console.error('[OutboxService] Critical tracking log sync failure:', err);
        return EMPTY;
      })
    ).subscribe();
  }

  /** Queues an offline mutation; upsert/conflict handling lives in the SQLite engine. */
  public enqueue(item: OutboxEnvelope): Observable<void> {
    return from(this.sqlite.enqueueSyncItem(item)).pipe(
      tap(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine && this.auth.isAuthenticated()) {
          this.triggerOutboxSync();
        }
      }),
      map(() => void 0),
      catchError((err) => {
        console.error('[OutboxService] Failed to register outbox sync item:', err);
        return of(void 0);
      })
    );
  }

  public triggerOutboxSync(): void {
    if (this.activeSyncSubscription && !this.activeSyncSubscription.closed) {
      console.warn('[OutboxService] Outbox processing already in motion. Request skipped.');
      return;
    }
    this.activeSyncSubscription = this.executeBulkSyncPipelineStream().subscribe();
  }

  public executeBulkSyncPipelineStream(): Observable<void> {
    if (!this.auth.isAuthenticated()) {
      return of(void 0);
    }

    return defer(() => {
      return from(this.sqlite.getPendingSyncItems()).pipe(
        switchMap((rawRecords: SyncQueueRow[]) => {
          if (rawRecords.length === 0) {
            console.log('[OutboxService] Local queue empty. Storage is fully synced with cloud state.');
            return of(void 0);
          }

          const targetBatchIds = rawRecords.map(r => r.id);

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

          console.log(`[OutboxService] Piping ${targetBatchIds.length} sequential operations down the NDJSON channel...`);

          return this.backend.streamJsonRecordsToServer(outboxDataStream$).pipe(
            switchMap(() => {
              if (targetBatchIds.length === 0) return of(void 0);
              return from(this.sqlite.clearSyncItemsBatch(targetBatchIds));
            }),
            tap(() => {
              console.log(`[OutboxService] Stream pass completed. Purged ${targetBatchIds.length} entries from database.`);
            }),
            map(() => void 0)
          );
        }),
        catchError((err) => {
          console.error('[OutboxService] Background transfer stream terminated.', err);
          return of(void 0);
        })
      );
    });
  }
}
