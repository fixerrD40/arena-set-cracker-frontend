import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SqliteService } from '../sqlite/sqlite.service';
import { syncQueue } from '../sqlite/sqlite.schema';
import { AuthService } from './auth.service';
import { asc, eq } from 'drizzle-orm';
import { Observable, of, fromEvent, merge } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';

// Infer the strict structure type directly from your Drizzle schema definition
export type SyncQueueItem = typeof syncQueue.$inferSelect;

@Injectable({
  providedIn: 'root',
})
export class OutboxService extends SqliteService<SyncQueueItem, SyncQueueItem> {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = 'https://your-api-url.com';

  // High-performance optimization map: Tracks "entityType:recordId" -> SQLite Queue ID
  private readonly queueIndexCache = new Map<string, number>();
  private cacheInitialized = false;

  constructor() {
    super(syncQueue, {
      toDomain: (entity) => ({
        ...entity,
        // Safely parse row text columns back into active JavaScript objects
        payload: typeof entity.payload === 'string' ? JSON.parse(entity.payload) : entity.payload
      }),
      fromDomain: (domain) => ({
        ...domain,
        payload: typeof domain.payload !== 'string' ? JSON.stringify(domain.payload) : domain.payload
      })
    });
  }

  /**
   * Safe initialization: pre-loads your cache map before spinning up flushes
   */
  public initializeEngine(): void {
    if (this.cacheInitialized) return;

    this.findAll().pipe(
      tap((existingRows: SyncQueueItem[]) => {
        for (const row of existingRows) {
          const targetId = row.payload?.id;
          if (targetId) {
            const key = `${row.entityType}:${targetId}`;
            this.queueIndexCache.set(key, row.id);
          }
        }
        this.cacheInitialized = true;
      }),
      switchMap(() => {
        // Trigger initial network sync and monitor connection restoration safely
        this.triggerOutboxSync();
        return merge(fromEvent(window, 'online'));
      }),
      tap(() => this.triggerOutboxSync()),
      catchError((err) => {
        console.error('Sync queue engine initialization failed:', err);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Operation-Squashing Enqueue Algorithm
   */
  public enqueue(item: Omit<SyncQueueItem, 'id' | 'createdAt'>): Observable<SyncQueueItem> {
    const targetId = item.payload?.id;
    const entityKey = `${item.entityType}:${targetId}`;
    const existingRowId = targetId ? this.queueIndexCache.get(entityKey) : undefined;

    return this.loadDatabaseEngine().pipe(
      map((db) => {
        let returnItem: SyncQueueItem | null = null;
        const currentIsoTimestamp = new Date().toISOString();

        if (existingRowId !== undefined) {
          const selectCompiled = this.builder.select().from(syncQueue).where(eq(syncQueue.id, existingRowId)).toSQL();
          const stmt = db.prepare(selectCompiled.sql);
          stmt.bind(selectCompiled.params);

          let existing: any = null;
          if (stmt.step()) {
            existing = stmt.getAsObject();
          }
          stmt.free();

          if (existing && existing.id) {
            const castPayload = typeof existing.payload === 'string' ? JSON.parse(existing.payload) : existing.payload;

            // --- CRITICAL SQUASH 1: Merge local updates onto existing configurations ---
            if (item.action === 'UPDATE' && (existing.action === 'CREATE' || existing.action === 'UPDATE')) {
              const updatedPayload = {
                ...castPayload,
                entity: { ...castPayload.entity, ...item.payload.entity }
              };

              const updateCompiled = this.builder
                .update(syncQueue)
                .set({ payload: JSON.stringify(updatedPayload), createdAt: currentIsoTimestamp })
                .where(eq(syncQueue.id, existingRowId))
                .toSQL();

              db.run(updateCompiled.sql, updateCompiled.params);

              returnItem = {
                id: existingRowId,
                entityType: existing.entityType as 'set' | 'deck',
                action: existing.action as 'CREATE' | 'UPDATE' | 'DELETE',
                payload: updatedPayload,
                createdAt: currentIsoTimestamp
              };
            }

            // --- CRITICAL SQUASH 2: Evict un-synced creations completely from storage ---
            else if (item.action === 'DELETE') {
              if (existing.action === 'CREATE') {
                const deleteCompiled = this.builder.delete(syncQueue).where(eq(syncQueue.id, existingRowId)).toSQL();
                db.run(deleteCompiled.sql, deleteCompiled.params);

                this.queueIndexCache.delete(entityKey);
                returnItem = { id: -1, ...item, createdAt: currentIsoTimestamp } as SyncQueueItem;
              } else {
                const updateCompiled = this.builder
                  .update(syncQueue)
                  .set({ action: 'DELETE', payload: JSON.stringify({ id: targetId }), createdAt: currentIsoTimestamp })
                  .where(eq(syncQueue.id, existingRowId))
                  .toSQL();

                db.run(updateCompiled.sql, updateCompiled.params);

                returnItem = {
                  id: existingRowId,
                  entityType: existing.entityType as 'set' | 'deck',
                  action: 'DELETE',
                  payload: { id: targetId },
                  createdAt: currentIsoTimestamp
                };
              }
            }
          }
        }

        // --- BASELINE: WRITE STANDARD SEPARATE ENEMY TRANSACTIONS ---
        if (!returnItem) {
          const insertCompiled = this.builder
            .insert(syncQueue)
            .values({
              entityType: item.entityType,
              action: item.action,
              payload: JSON.stringify(item.payload),
              createdAt: currentIsoTimestamp
            })
            .toSQL();

          db.run(insertCompiled.sql, insertCompiled.params);

          const executionResult = db.exec("SELECT last_insert_rowid() as id");
          // sql.js rows extract as matrix grids: [firstRow][firstColumn]
          const allocatedId = (executionResult[0]?.values[0]?.[0] as number) ?? -1;

          if (targetId) {
            this.queueIndexCache.set(entityKey, allocatedId);
          }

          returnItem = {
            id: allocatedId,
            ...item,
            createdAt: currentIsoTimestamp
          } as SyncQueueItem;
        }

        this.saveDatabaseToDisk(db);
        db.close();

        return returnItem;
      })
    );
  }

  /**
   * Pulls the single oldest queue item from your local cache file
   */
  private peekNext(): Observable<SyncQueueItem | null> {
    const compiled = this.builder
      .select()
      .from(syncQueue)
      .orderBy(asc(syncQueue.id))
      .limit(1)
      .toSQL();

    return this.executeRawSelect<any>(compiled).pipe(
      map((rows) => {
        // Guard clause: Return null immediately if the database queue is entirely empty
        if (!rows || rows.length === 0) return null;

        const firstRow = rows[0];

        return this.mapper.toDomain(firstRow);
      })
    );
  }

  /**
   * Continuous Sequence Flusher
   */
  public triggerOutboxSync(): void {
    if (!this.auth.isAuthenticated() || !this.cacheInitialized) return;

    this.peekNext().pipe(
      switchMap((queueItem) => {
        if (!queueItem) return of(null);

        return this.dispatchNetworkCall(queueItem).pipe(
          switchMap(() => {
            const compiledDelete = this.builder
              .delete(syncQueue)
              .where(eq(syncQueue.id, queueItem.id))
              .toSQL();

            return this.loadDatabaseEngine().pipe(
              map((db) => {
                db.run(compiledDelete.sql, compiledDelete.params);
                this.saveDatabaseToDisk(db);
                db.close();
                return queueItem;
              })
            );
          }),
          tap((clearedItem) => {
            const targetId = clearedItem.payload?.id;
            if (targetId) {
              const entityKey = `${clearedItem.entityType}:${targetId}`;
              this.queueIndexCache.delete(entityKey);
            }

            // Loop back around to clear any consecutive items in line
            this.triggerOutboxSync();
          })
        );
      }),
      catchError((err) => {
        console.warn('Network sync paused. Queue items retained safely on disk.', err?.message || err);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Directly maps network operations to standard endpoints with JSON bodies
   */
  private dispatchNetworkCall(item: SyncQueueItem): Observable<any> {
    const url = `${this.baseUrl}/${item.entityType}`;
    const options = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

    switch (item.action) {
      case 'CREATE':
        return this.http.post(url, item.payload.entity, options);
      case 'UPDATE':
        return this.http.patch(`${url}/${item.payload.id}`, item.payload.entity, options);
      case 'DELETE':
        return this.http.delete(`${url}/${item.payload.id}`, options);
      default:
        throw new Error(`Invalid sync action type signature: ${item.action}`);
    }
  }
}
