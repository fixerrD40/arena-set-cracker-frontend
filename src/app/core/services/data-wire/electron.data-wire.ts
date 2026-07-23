// src/app/core/data-wire/electron-data-wire.service.ts
import { inject, Injectable } from '@angular/core';
import { from, Observable, of, throwError } from 'rxjs';
import { concatMap, map, toArray } from 'rxjs/operators';
import { type SQLiteTable } from 'drizzle-orm/sqlite-core';
import { eq, getTableName, InferSelectModel } from 'drizzle-orm';
import { DataWire } from './data-wire.contract';
import { SqliteEngine } from '../../storage/sqlite/sqlite.engine';
import { OutboxService } from '../outbox.service';

// Central Registry Mappers (Kept strictly encapsulated inside this infrastructure folder)
import { mapRowToSet, serializeSetToSqlite } from '../../../shared/models/set/set.mappers';
import { mapCardToInsert, mapRowToCard } from '../../../shared/models/card/card.mappers';
import { mapDeckToInsert, mapRowToDeck } from '../../../shared/models/deck/deck.mappers';
import { sets, cards, decks } from '../../storage/sqlite/sqlite.schema';

@Injectable({ providedIn: 'root' })
export class ElectronDataWire implements DataWire {
  private readonly sqliteEngine = inject(SqliteEngine);
  private readonly outbox = inject(OutboxService);

  /** Internal registry matching table schema tokens to local storage column serializers */
  private readonly serializerRegistry = new Map<any, (domain: any) => any>([
    [sets, serializeSetToSqlite],
    [cards, mapCardToInsert],
    [decks, mapDeckToInsert]
  ]);

  /** Internal registry matching table schema tokens to local row hydrators */
  private readonly hydratorRegistry = new Map<any, (raw: any) => any>([
    [sets, mapRowToSet],
    [cards, mapRowToCard],
    [decks, mapRowToDeck]
  ]);

  /**
   * DYNAMIC DOMAIN INSERT CONDUCTOR
   * Accepts a pure, platform-blind domain model, formats it natively using its
   * internal mappers registry, runs the transaction lock, and yields the domain model back.
   */
  public insert<TTable extends SQLiteTable<any>, TInput = any, TOutput = any>(table: TTable, domainModel: TInput): Observable<TOutput> {
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) return throwError(() => new Error('[ElectronDataWire] Engine uninitialized.'));

    try {
      const serializer = this.serializerRegistry.get(table);
      const dbPayload = serializer ? serializer(domainModel) : domainModel;

      const query = db.insert(table).values(dbPayload).toSQL();
      db.run(query.sql, query.params);
      if (this.flush) this.flush();

      const tableName = getTableName(table);
      if (tableName === 'decks' || tableName === 'sets') {
        const entityType = tableName === 'decks' ? 'deck' : 'set';
        return this.outbox.enqueue({ entityType, action: 'CREATE', payload: domainModel }).pipe(map(() => domainModel as unknown as TOutput));
      }
      return of(domainModel as unknown as TOutput);
    } catch (err) { return throwError(() => err); }
  }

  /**
   * Performs a high-performance batch row mutation transaction block.
   * Intercepts pure domain arrays, serializes them natively to SQLite column requirements,
   * commits them to disk, and bulk enqueues tracking frames to the outbox.
   */
  public insertBulk<TTable extends SQLiteTable<any>, TInput = any, TOutput = any>(
    table: TTable,
    payloads: TInput[] // Accepts an array of pure domain objects (e.g. MtgCard[])
  ): Observable<TOutput[]> {
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) {
      return throwError(() => new Error('[ElectronDataWire] Engine not bootstrapped.'));
    }
    if (!payloads || payloads.length === 0) {
      return of([]);
    }

    try {
      // 1. Map your domain array down to a raw SQLite insert column layout block internally
      const serializer = this.serializerRegistry.get(table);
      const dbPayloads = serializer ? payloads.map(p => serializer(p)) : payloads;

      // 2. Compile and execute your high-performance multi-row insert statement
      const query = db.insert(table).values(dbPayloads).toSQL();
      db.run(query.sql, query.params);

      if (this.flush) this.flush();

      const tableName = getTableName(table);

      // 3. Batch enqueue synchronization frames sequentially via concatMap to preserve chronological order
      if (tableName === 'decks' || tableName === 'sets') {
        const entityType = tableName === 'decks' ? 'deck' : 'set';

        return from(payloads).pipe(
          concatMap(domainItem => this.outbox.enqueue({
            entityType,
            action: 'CREATE',
            payload: domainItem
          })),
          toArray(),
          map(() => payloads as unknown as TOutput[]) // Yield your domain array back to the stream
        );
      }

      // If writing unregistered batch assets (like static reference cards), resolve immediately
      return of(payloads as unknown as TOutput[]);
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Merges partial modifications onto a local record by unique primary identifier.
   * Extracts delta changes and appends an UPDATE tracking frame to the outbox.
   */
  public update<TTable extends SQLiteTable<any>>(
    table: TTable,
    id: string | number,
    payload: any // Accepts the loose partial domain delta tracking changes payload object
  ): Observable<void> {
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) {
      return throwError(() => new Error('[ElectronDataWire] Engine not bootstrapped.'));
    }

    try {
      const idColumn = (table as any).id;
      if (!idColumn) {
        return throwError(() => new Error('[ElectronDataWire] Target table lacks an "id" tracking token.'));
      }

      // 1. Extract and serialize partial column configurations natively if mapped
      const serializer = this.serializerRegistry.get(table);
      const dbPayload = serializer ? serializer(payload) : payload;

      // 2. Commit partial column delta modifications LOCAL FIRST
      const query = db.update(table).set(dbPayload).where(eq(idColumn, id)).toSQL();
      db.run(query.sql, query.params);

      const tableName = getTableName(table);

      // 3. Log delta frame state directly to the background sync logs queue
      if (tableName === 'decks' || tableName === 'sets') {
        const entityType = tableName === 'decks' ? 'deck' : 'set';

        return this.outbox.enqueue({
          entityType,
          action: 'UPDATE',
          payload: { id, ...payload } // Capture tracking delta properties for server replaying
        });
      }

      return of(void 0);
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Deletes a record from the local SQLite database by unique identity lookup.
   * Wipes disk allocations and enqueues a DELETE tombstone trace to the sync log queue.
   */
  public delete<TTable extends SQLiteTable<any>>(
    table: TTable,
    id: string | number
  ): Observable<void> {
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) {
      return throwError(() => new Error('[ElectronDataWire] Engine not bootstrapped.'));
    }

    try {
      const idColumn = (table as any).id;
      if (!idColumn) {
        return throwError(() => new Error('[ElectronDataWire] Target table lacks an "id" tracking token.'));
      }

      // 1. Drop localized row elements near the metal FIRST
      const query = db.delete(table).where(eq(idColumn, id)).toSQL();
      db.run(query.sql, query.params);

      const tableName = getTableName(table);

      // 2. Write structural tombstone elimination tags into the outbox
      if (tableName === 'decks' || tableName === 'sets') {
        const entityType = tableName === 'decks' ? 'deck' : 'set';

        return this.outbox.enqueue({
          entityType,
          action: 'DELETE',
          payload: { id } // Passes the deletion primary key lookup mapping context
        });
      }

      return of(void 0);
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Extracts raw row snapshots from the local SQLite table dataset and handles domain hydration.
   */
  public fetchCollection<TTable extends SQLiteTable<any>, TOutput = any>(
    table: TTable,
    contextId?: string | number
  ): Observable<TOutput[]> {
    const db = this.sqliteEngine.cachedDbInstance;
    if (!db) {
      return throwError(() => new Error('[ElectronDataWire] Engine uninitialized.'));
    }

    const setIdColumn = (table as any).setId;
    let queryBuilder = db.select().from(table);

    if (contextId !== undefined && contextId !== 'all' && setIdColumn) {
      queryBuilder = queryBuilder.where(eq(setIdColumn, String(contextId))) as any;
    }

    return from(queryBuilder).pipe(
      map((untypedRows) => {
        // 🌟 FIX: Cast the unknown rows array natively into the matching Drizzle select model shape [INDEX]
        const rows = untypedRows as InferSelectModel<TTable>[];

        // Extract the appropriate domain hydrator function reference from your internal registry map [INDEX]
        const activeHydrator = this.hydratorRegistry.get(table);

        // The compiler now beautifully understands exactly what fields exist on a row! [INDEX]
        return activeHydrator
          ? rows.map((row) => activeHydrator(row))
          : (rows as unknown as TOutput[]);
      })
    );
  }

  public flush(): void {
    this.sqliteEngine.flush();
  }
}
