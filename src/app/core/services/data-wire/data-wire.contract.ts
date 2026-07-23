// src/app/core/data-wire/data-wire.contract.ts
import { Observable } from 'rxjs';

/**
 * Platform Execution Boundary Data Conduit Contract.
 * The generic 'TTableBase' slots your structural type validations safely.
 */
export interface DataWire<TTableBase = any> {
  insert<TInput = any, TOutput = any>(
    table: TTableBase, // 🌟 Bound directly to the root configuration parameter
    payload: TInput
  ): Observable<TOutput>;

  insertBulk<TInput = any, TOutput = any>(
    table: TTableBase,
    payloads: TInput[]
  ): Observable<TOutput[]>;

  update(table: TTableBase, id: string | number, payload: any): Observable<void>;
  delete(table: TTableBase, id: string | number): Observable<void>;

  fetchCollection<TOutput = any>(
    table: TTableBase,
    contextId?: string | number
  ): Observable<TOutput[]>;

  flush?(): void;
}
