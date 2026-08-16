// src/app/core/data-wire/electron.data-wire.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, of, from, throwError } from 'rxjs';
import { concatMap, map, catchError, toArray } from 'rxjs/operators';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { getTableName, getTableColumns, eq, InferSelectModel } from 'drizzle-orm';

// 🌟 Reconciled Global Infrastructure Imports
import { SQLITE_ENGINE_TOKEN } from '../../sqlite/sqlite.engine';
import { OutboxService } from '../outbox.service';
import { hydrateRow, serializePayload, serializePayloadsBulk } from '../../sqlite/sqlite.registry';

@Injectable({
  providedIn: 'root'
})
export class ElectronDataWire {
  // 🌟 Inject the new base SQLite abstraction token cleanly
  private readonly sqliteEngine = inject(SQLITE_ENGINE_TOKEN);
  private readonly outbox = inject(OutboxService);

  /**
   * DYNAMIC DOMAIN INSERT CONDUCTOR
   */
  public insert<TInput = any, TOutput = any>(
    table: SQLiteTable<any>,
    domainModel: TInput
  ): Observable<TOutput> {
    const db = (this.sqliteEngine as any).cachedDbInstance;
    if (!db) return throwError(() => new Error('[ElectronDataWire] Engine uninitialized.'));

    try {
      const dbPayload = serializePayload(table, domainModel);

      db.insert(table).values(dbPayload).run();

      return of(void 0).pipe(
        concatMap(() => {
          this.flush();
          const tableNameStr = getTableName(table);

          if (tableNameStr === 'decks' || tableNameStr === 'sets') {
            const entityType = tableNameStr === 'decks' ? 'deck' : 'set';
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
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Performs a high-performance batch row mutation transaction block.
   */
  public insertBulk<TInput = any, TOutput = any>(
    table: SQLiteTable<any>,
    payloads: TInput[]
  ): Observable<TOutput[]> {
    const db = (this.sqliteEngine as any).cachedDbInstance;
    if (!db) return throwError(() => new Error('[ElectronDataWire] Engine not bootstrapped.'));
    if (!payloads || payloads.length === 0) return of([]);

    try {
      const dbPayloads = serializePayloadsBulk(table, payloads);

      db.insert(table).values(dbPayloads).run();

      return of(void 0).pipe(
        concatMap(() => {
          this.flush();
          const tableNameStr = getTableName(table);

          if (tableNameStr === 'decks' || tableNameStr === 'sets') {
            const entityType = tableNameStr === 'decks' ? 'deck' : 'set';

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
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Updates an existing database row synchronously by unique primary key,
   * flushes data arrays to disk, and pushes an UPDATE frame context straight to outbox logs.
   */
  public update<TInput = any, TOutput = any>(
    table: SQLiteTable<any>,
    domainModel: TInput
  ): Observable<TOutput> {
    const db = (this.sqliteEngine as any).cachedDbInstance;
    if (!db) return throwError(() => new Error('[ElectronDataWire] Engine uninitialized.'));

    try {
      // 1. Resolve your ID identity columns and lookups dynamically
      const idColumn = (table as any).id;
      const recordId = (domainModel as any)?.id;

      if (!idColumn || !recordId) {
        return throwError(() => new Error('[ElectronDataWire] Update aborted: Missing unique primary key identifier "id".'));
      }

      // 2. Normalize your payload models through your serialization registries
      const dbPayload = serializePayload(table, domainModel);

      // 3. Commit modification statements directly near the WebAssembly metal
      db.update(table)
        .set(dbPayload)
        .where(eq(idColumn, recordId))
        .run();

      // 4. Sequence down the RxJS pipeline to safely track updates and outbox pushes
      return of(void 0).pipe(
        concatMap(() => {
          this.flush();
          const tableNameStr = getTableName(table);

          // Append transaction frames only for synchronizable entities
          if (tableNameStr === 'decks' || tableNameStr === 'sets') {
            const entityType = tableNameStr === 'decks' ? 'deck' : 'set';
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
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Deletes a record from the local SQLite database by unique identity lookup.
   */
  public delete(
    table: SQLiteTable<any>,
    id: string | number
  ): Observable<void> {
    const db = (this.sqliteEngine as any).cachedDbInstance;
    if (!db) return throwError(() => new Error('[ElectronDataWire] Engine not bootstrapped.'));

    try {
      const idColumn = (table as any).id;
      if (!idColumn) {
        return throwError(() => new Error('[ElectronDataWire] Target table lacks an "id" tracking token.'));
      }

      db.delete(table).where(eq(idColumn, id)).run();

      return of(void 0).pipe(
        concatMap(() => {
          this.flush();
          const tableName = getTableName(table);

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
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Extracts raw row snapshots from the local SQLite table dataset and handles domain hydration.
   */
  public fetchCollection<TOutput = any>(table: SQLiteTable<any>, contextId?: string | number): Observable<TOutput[]> {
    const db = (this.sqliteEngine as any).cachedDbInstance;
    if (!db) return throwError(() => new Error('[DataWire] Engine uninitialized.'));

    try {
      const columns = getTableColumns(table);
      const setIdColumn = columns['setId'] || columns['set_id'];

      let queryBuilder = db.select().from(table);
      if (contextId !== undefined && contextId !== 'all' && setIdColumn) {
        queryBuilder = queryBuilder.where(eq(setIdColumn, String(contextId))) as any;
      }

      const untypedRows = queryBuilder.all() as Record<string, any>[];

      const result = untypedRows.map((row) => hydrateRow<TOutput>(table, row));

      return of(result);
    } catch (err) { return throwError(() => err); }
  }

  /**
   * Synchronizes memory heap changes safely to native disk frames.
   */
  public flush(): void {
    if (typeof (this.sqliteEngine as any).flush === 'function') {
      (this.sqliteEngine as any).flush();
    }
  }
}
