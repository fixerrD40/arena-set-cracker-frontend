// src/app/core/data-wire/electron.data-wire.service.ts
import { inject, Injectable } from '@angular/core';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, concatMap, map, toArray } from 'rxjs/operators';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { eq, getTableColumns, getTableName, InferSelectModel } from 'drizzle-orm';
import { DataWire } from './data-wire.contract';
import { SqliteEngine } from '../../storage/sqlite/sqlite.engine';
import { OutboxService } from '../outbox.service';

// Central Registry Mappers
import { mapRowToSet, serializeSetToSqlite } from '../../../shared/models/set/set.mappers';
import { mapCardToInsert, mapRowToCard } from '../../../shared/models/card/card.mappers';
import { mapDeckToInsert, mapRowToDeck } from '../../../shared/models/deck/deck.mappers';

@Injectable({ providedIn: 'root' })
export class ElectronDataWire implements DataWire<SQLiteTable<any>> {
  private readonly sqliteEngine = inject(SqliteEngine);
  private readonly outbox = inject(OutboxService);

  /**
   * 🌟 FIX: Index your maps using string table name names (e.g., 'sets', 'cards')
   * to bypass duplicate in-memory schema object references.
   */
  private readonly serializerRegistry = new Map<string, (domain: any) => any>([
    ['sets', serializeSetToSqlite],
    ['cards', mapCardToInsert],
    ['decks', mapDeckToInsert]
  ]);

  private readonly hydratorRegistry = new Map<string, (raw: any) => any>([
    ['sets', mapRowToSet],
    ['cards', mapRowToCard],
    ['decks', mapRowToDeck]
  ]);

  /**
   * DYNAMIC DOMAIN INSERT CONDUCTOR
   */
  public insert<TInput = any, TOutput = any>(
    table: SQLiteTable<any>,
    domainModel: TInput
  ): Observable<TOutput> {
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) return throwError(() => new Error('[ElectronDataWire] Engine uninitialized.'));

    try {
      const tableName = getTableName(table);
      const serializer = this.serializerRegistry.get(tableName);
      const dbPayload = serializer ? serializer(domainModel) : domainModel;

      // 🌟 FIX 1: Run the statement synchronously and wrap the response context in 'of()'
      // This stops RxJS from expecting a Promise and allows sql.js to process parameters natively.
      db.insert(table).values(dbPayload).run();

      return of(void 0).pipe(
        concatMap(() => {
          if (this.flush) this.flush();

          if (tableName === 'decks' || tableName === 'sets') {
            const entityType = tableName === 'decks' ? 'deck' : 'set';
            return this.outbox.enqueue({
              entityType,
              action: 'CREATE',
              payload: domainModel
            }).pipe(
              map(() => domainModel as unknown as TOutput)
            );
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
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) return throwError(() => new Error('[ElectronDataWire] Engine not bootstrapped.'));
    if (!payloads || payloads.length === 0) return of([]);

    try {
      const tableName = getTableName(table);
      const serializer = this.serializerRegistry.get(tableName);
      const dbPayloads = serializer ? payloads.map(p => serializer(p)) : payloads;

      // 🌟 FIX 2: Execute synchronous batch statement insertion directly near the metal
      db.insert(table).values(dbPayloads).run();

      return of(void 0).pipe(
        concatMap(() => {
          if (this.flush) this.flush();

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
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Merges partial modifications onto a local record by unique primary identifier.
   * Extracts delta changes and appends an UPDATE tracking frame to the outbox.
   */
  public update(
    table: SQLiteTable<any>, // 🌟 Bound cleanly to the root class type definition
    id: string | number,
    payload: any
  ): Observable<void> {
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) return throwError(() => new Error('[ElectronDataWire] Engine not bootstrapped.'));

    try {
      // Safely check for an ID tracking column using dynamic runtime properties
      const idColumn = (table as any).id;
      if (!idColumn) {
        return throwError(() => new Error('[ElectronDataWire] Target table lacks an "id" tracking token.'));
      }

      const tableName = getTableName(table);
      const serializer = this.serializerRegistry.get(tableName);
      let dbPayload = payload;

      // Extract sparse column updates safely without wiping unmentioned fields
      if (serializer) {
        const fullyMapped = serializer(payload);
        dbPayload = {};
        for (const key in payload) {
          if (Object.prototype.hasOwnProperty.call(payload, key) && fullyMapped[key] !== undefined) {
            dbPayload[key] = fullyMapped[key];
          }
        }
      }

      // Synchronously execute your update transaction directly into WebAssembly memory bounds
      db.update(table).set(dbPayload).where(eq(idColumn, id)).run();

      // Wrap synchronous completion into an RxJS stream framework cleanly
      return of(void 0).pipe(
        concatMap(() => {
          if (this.flush) this.flush();

          if (tableName === 'decks' || tableName === 'sets') {
            const entityType = tableName === 'decks' ? 'deck' : 'set';
            return this.outbox.enqueue({
              entityType,
              action: 'UPDATE',
              payload: { id, ...payload } // Capture tracking delta context for remote replaying
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
   * Deletes a record from the local SQLite database by unique identity lookup.
   * Wipes disk allocations and enqueues a DELETE tombstone trace to the sync log queue.
   */
  public delete(
    table: SQLiteTable<any>, // 🌟 Bound cleanly to the root class type definition
    id: string | number
  ): Observable<void> {
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) return throwError(() => new Error('[ElectronDataWire] Engine not bootstrapped.'));

    try {
      // Safely check for an ID tracking column using dynamic runtime properties
      const idColumn = (table as any).id;
      if (!idColumn) {
        return throwError(() => new Error('[ElectronDataWire] Target table lacks an "id" tracking token.'));
      }

      // Synchronously execute row elimination directly near the metal
      db.delete(table).where(eq(idColumn, id)).run();

      return of(void 0).pipe(
        concatMap(() => {
          if (this.flush) this.flush();
          const tableName = getTableName(table);

          if (tableName === 'decks' || tableName === 'sets') {
            const entityType = tableName === 'decks' ? 'deck' : 'set';
            return this.outbox.enqueue({
              entityType,
              action: 'DELETE',
              payload: { id } // Passes the deletion key mapping context straight to outbox logs
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
  public fetchCollection<TOutput = any>(
    table: SQLiteTable<any>, // 🌟 FIX: Removed TTable generic; type directly against SQLiteTable<any>
    contextId?: string | number
  ): Observable<TOutput[]> {
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) return throwError(() => new Error('[ElectronDataWire] Engine uninitialized.'));

    try {
      const tableName = getTableName(table);
      const columns = getTableColumns(table);
      const setIdColumn = columns['setId'] || columns['set_id'];

      let queryBuilder = db.select().from(table);

      if (contextId !== undefined && contextId !== 'all' && setIdColumn) {
        queryBuilder = queryBuilder.where(eq(setIdColumn, String(contextId))) as any;
      }

      // Pull database row snapshots synchronously via .all() and emit down the pipeline stream
      const untypedRows = queryBuilder.all();

      // 🌟 FIX: Cast using SQLiteTable<any> directly to keep the compiler happy without local generics
      const rows = untypedRows as InferSelectModel<SQLiteTable<any>>[];
      const activeHydrator = this.hydratorRegistry.get(tableName);

      const result = activeHydrator
        ? rows.map((row) => activeHydrator(row))
        : (rows as unknown as TOutput[]);

      return of(result);
    } catch (err) {
      return throwError(() => err);
    }
  }

  public flush(): void {
    if (this.sqliteEngine.flush) {
      this.sqliteEngine.flush();
    }
  }
}
