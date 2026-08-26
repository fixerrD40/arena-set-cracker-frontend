import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export const DATA_WIRE_TOKEN = new InjectionToken<DataWire>('MTG_DATA_WIRE_SYSTEM_TOKEN');

/** Platform-agnostic persistence boundary (Electron SQLite or browser WASM). */
export interface DataWire<TTableBase = any> {
  insert<TInput = any, TOutput = any>(
    table: TTableBase,
    payload: TInput
  ): Observable<TOutput>;

  insertBulk<TInput = any, TOutput = any>(
    table: TTableBase,
    payloads: TInput[]
  ): Observable<TOutput[]>;

  update<TInput = any, TOutput = any>(
    table: TTableBase,
    domainModel: TInput
  ): Observable<TOutput>;

  delete(
    table: TTableBase,
    id: string | number
  ): Observable<void>;

  /** Deletes all rows where a named column equals value (e.g. deck_cards by deckId). */
  deleteWhere(
    table: TTableBase,
    columnKey: string,
    value: string | number
  ): Observable<void>;

  fetchRecord<TOutput = any>(
    table: TTableBase,
    id: string | number
  ): Observable<TOutput | null>;

  fetchCollection<TOutput = any>(
    table: TTableBase,
    contextId?: string | number
  ): Observable<TOutput[]>;

  flush?(): void;
}
