// src/app/core/data-wire/data-wire.contract.ts
import { Observable } from 'rxjs';
import { type SQLiteTable } from 'drizzle-orm/sqlite-core';

/**
 * Platform Execution Boundary Data Conduit.
 *
 * Enforces zero awareness of application state, domain models, or environment targets.
 * Callers pass pure domain models on writes and receive pure domain models on reads.
 */
export interface DataWire {
  insert<TTable extends SQLiteTable<any>, TInput = any, TOutput = any>(
    table: TTable,
    payload: TInput
  ): Observable<TOutput>;

  insertBulk<TTable extends SQLiteTable<any>, TInput = any, TOutput = any>(
    table: TTable,
    payloads: TInput[]
  ): Observable<TOutput[]>;

  update<TTable extends SQLiteTable<any>>(table: TTable, id: string | number, payload: any): Observable<void>;
  delete<TTable extends SQLiteTable<any>>(table: TTable, id: string | number): Observable<void>;

  /**
   * Extracts collections and utilizes internal platform-specific registries
   * to automatically emit fully hydrated domain model arrays.
   */
  fetchCollection<TTable extends SQLiteTable<any>, TOutput = any>(
    table: TTable,
    contextId?: string | number
  ): Observable<TOutput[]>;

  flush?(): void;
}
