// src/app/core/services/data-wire/cloud.data-wire.ts
import { Injectable, inject } from '@angular/core';
import { Observable, of, from, throwError } from 'rxjs';
import { concatMap, map, catchError, toArray } from 'rxjs/operators';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { getTableName, getTableColumns, eq } from 'drizzle-orm';

// 🌟 Reconciled Configuration & Registry Imports
import { SQLITE_ENGINE_TOKEN } from '../../sqlite/sqlite.engine';
import { OutboxService } from '../outbox.service';
import { serializePayload, serializePayloadsBulk, hydrateRow } from '../../sqlite/sqlite.registry';

@Injectable({
  providedIn: 'root'
})
export class CloudDataWire {
  // 🌟 Injects the same abstract token, which maps to BrowserWasmSqliteEngine on web!
  private readonly sqliteEngine = inject(SQLITE_ENGINE_TOKEN);
  private readonly outbox = inject(OutboxService);

  /**
   * DYNAMIC DOMAIN INSERT CONDUCTOR (WEB SANDBOX)
   */
  public insert<TInput = any, TOutput = any>(
    table: SQLiteTable<any>,
    domainModel: TInput
  ): Observable<TOutput> {
    const db = (this.sqliteEngine as any).cachedDbInstance;
    if (!db) return throwError(() => new Error('[CloudDataWire] Browser engine uninitialized.'));

    try {
      const tableName = getTableName(table);

      // 🌟 Unified Serialization pass
      const dbPayload = serializePayload(table, domainModel);
      db.insert(table).values(dbPayload).run();

      return of(void 0).pipe(
        concatMap(() => {
          this.flush();
          if (tableName === 'decks' || tableName === 'sets') {
            const entityType = tableName === 'decks' ? 'deck' : 'set';
            return this.outbox.enqueue({
              entityType,
              action: 'CREATE',
              payload: domainModel
            }).pipe(map(() => domainModel as unknown as TOutput));
          }
          return of(domainModel as unknown as TOutput);
        }),
        catchError((err) => throwError(() => err))
      );
    } catch (err) { return throwError(() => err); }
  }

  /**
   * HIGH-PERFORMANCE BATCH INSERTION WIRE (WEB SANDBOX)
   * Collapses multiple web-side offline models into a unified database execution frame.
   */
  public insertBulk<TInput = any, TOutput = any>(
    table: SQLiteTable<any>,
    payloads: TInput[]
  ): Observable<TOutput[]> {
    const db = (this.sqliteEngine as any).cachedDbInstance;
    if (!db) return throwError(() => new Error('[CloudDataWire] Browser engine not bootstrapped.'));
    if (!payloads || payloads.length === 0) return of([]);

    try {
      const tableName = getTableName(table);

      // 🌟 High-performance plural array transformation
      const dbPayloads = serializePayloadsBulk(table, payloads);
      db.insert(table).values(dbPayloads).run();

      return of(void 0).pipe(
        concatMap(() => {
          this.flush();
          if (tableName === 'decks' || tableName === 'sets') {
            const entityType = tableName === 'decks' ? 'deck' : 'set';

            return from(payloads).pipe(
              concatMap(domainItem => this.outbox.enqueue({
                entityType,
                action: 'CREATE',
                payload: domainItem
              })),
              toArray(),
              map(() => payloads as unknown as TOutput[])
            );
          }
          return of(payloads as unknown as TOutput[]);
        }),
        catchError((err) => throwError(() => err))
      );
    } catch (err) { return throwError(() => err); }
  }

  /**
   * DYNAMIC DOMAIN UPDATE CONDUCTOR (WEB SANDBOX)
   */
  public update<TInput = any, TOutput = any>(
    table: SQLiteTable<any>,
    domainModel: TInput
  ): Observable<TOutput> {
    const db = (this.sqliteEngine as any).cachedDbInstance;
    if (!db) return throwError(() => new Error('[CloudDataWire] Browser engine uninitialized.'));

    try {
      const tableName = getTableName(table);
      const idColumn = (table as any).id;
      const recordId = (domainModel as any)?.id;

      if (!idColumn || !recordId) {
        return throwError(() => new Error('[CloudDataWire] Update aborted: Missing identifier "id".'));
      }

      const dbPayload = serializePayload(table, domainModel);
      db.update(table).set(dbPayload).where(eq(idColumn, recordId)).run();

      return of(void 0).pipe(
        concatMap(() => {
          this.flush();
          if (tableName === 'decks' || tableName === 'sets') {
            const entityType = tableName === 'decks' ? 'deck' : 'set';
            return this.outbox.enqueue({
              entityType,
              action: 'UPDATE',
              payload: domainModel
            }).pipe(map(() => domainModel as unknown as TOutput));
          }
          return of(domainModel as unknown as TOutput);
        }),
        catchError((err) => throwError(() => err))
      );
    } catch (err) { return throwError(() => err); }
  }

  /**
   * DYNAMIC DOMAIN DELETION CONDUCTOR (WEB SANDBOX)
   */
  public delete(table: SQLiteTable<any>, id: string | number): Observable<void> {
    const db = (this.sqliteEngine as any).cachedDbInstance;
    if (!db) return throwError(() => new Error('[CloudDataWire] Browser engine uninitialized.'));

    try {
      const tableName = getTableName(table);
      const idColumn = (table as any).id;

      if (!idColumn) {
        return throwError(() => new Error('[CloudDataWire] Target table lacks an "id" token.'));
      }

      db.delete(table).where(eq(idColumn, id)).run();

      return of(void 0).pipe(
        concatMap(() => {
          this.flush();
          if (tableName === 'decks' || tableName === 'sets') {
            const entityType = tableName === 'decks' ? 'deck' : 'set';
            return this.outbox.enqueue({
              entityType,
              action: 'DELETE',
              payload: { id }
            }).pipe(map(() => void 0));
          }
          return of(void 0);
        }),
        catchError((err) => throwError(() => err))
      );
    } catch (err) { return throwError(() => err); }
  }

  /**
   * EXTRACTS COLLECTION SNAPSHOTS & HYDRATES DOMAINS (WEB SANDBOX)
   */
  public fetchCollection<TOutput = any>(
    table: SQLiteTable<any>,
    contextId?: string | number
  ): Observable<TOutput[]> {
    const db = (this.sqliteEngine as any).cachedDbInstance;
    if (!db) return throwError(() => new Error('[CloudDataWire] Browser engine uninitialized.'));

    try {
      const columns = getTableColumns(table);
      const setIdColumn = columns['setId'] || columns['set_id'];

      let queryBuilder = db.select().from(table);
      if (contextId !== undefined && contextId !== 'all' && setIdColumn) {
        queryBuilder = queryBuilder.where(eq(setIdColumn, String(contextId))) as any;
      }

      // 🌟 Explicit dictionary type assertion silences warning 7006 completely!
      const untypedRows = queryBuilder.all() as Record<string, any>[];

      // 🌟 Clean automated type hydration routing
      const result = untypedRows.map((row) => hydrateRow<TOutput>(table, row));

      return of(result);
    } catch (err) { return throwError(() => err); }
  }

  /**
   * ASYNCHRONOUS WEB STATE FLUSH
   */
  public flush(): void {
    if (typeof (this.sqliteEngine as any).flushToIndexedDb === 'function') {
      (this.sqliteEngine as any).flushToIndexedDb();
    }
  }
}
