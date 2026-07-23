// src/app/core/data-wire/cloud.data-wire.ts
import { inject, Injectable } from '@angular/core';
import { from, Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { type SQLiteTable } from 'drizzle-orm/sqlite-core';
import { getTableName } from 'drizzle-orm';
import { DataWire } from './data-wire.contract';
import { BackendService } from '../backend.service';

// Pure Network Translation Mappers (Encapsulated inside the infrastructure layer)
import { mapJsonToSet, serializeSetToJSON } from '../../../shared/models/set/set.mappers';
import { mapJsonToCard, mapCardToJson } from '../../../shared/models/card/card.mappers';
import { mapJsonToDeck, mapDeckToJson } from '../../../shared/models/deck/deck.mappers';

@Injectable({
  providedIn: 'root',
})
export class CloudDataWire implements DataWire<SQLiteTable<any>> {
  private readonly backend = inject(BackendService);

  /**
   * Symmetrical Endpoint Registry.
   * Maps abstract headless Drizzle table tokens directly to their remote REST paths.
   */
private readonly endpointRegistry = new Map<string, string>([
    ['sets', 'sets'],
    ['decks', 'decks']
  ]);

  /** Internal registry mapping table schema tokens to Web/JSON REST API serializers */
  private readonly serializerRegistry = new Map<string, (domain: any) => any>([
    ['sets', serializeSetToJSON],
    ['cards', mapCardToJson],
    ['decks', mapDeckToJson]
  ]);

  /** Internal registry mapping table schema tokens to network payload hydrators */
  private readonly hydratorRegistry = new Map<string, (json: any) => any>([
    ['sets', mapJsonToSet],
    ['cards', mapJsonToCard],
    ['decks', mapJsonToDeck]
  ]);

  /**
   * Performs a single payload record mutation across the remote server API.
   * Serializes the domain object to a network payload literal before transport.
   */
  public insert<TInput = any, TOutput = any>(
    table: SQLiteTable<any>, // 🌟 Bound cleanly to the root class type definition
    domainModel: TInput
  ): Observable<TOutput> {
    try {
      const tableName = getTableName(table);

      // 🌟 RESILIENT CARD GUARD: Cloud completely ignores card writes
      if (tableName === 'cards') {
        return of(domainModel as unknown as TOutput);
      }

      // 🌟 FIX: Look up endpoints and mappers cleanly using string name identifiers
      const segment = this.endpointRegistry.get(tableName);
      if (!segment) {
        return throwError(() => new Error(`[CloudDataWire] Unmapped table schema signature submitted to insert: "${tableName}".`));
      }

      const serializer = this.serializerRegistry.get(tableName);
      const jsonPayload = serializer ? serializer(domainModel) : domainModel;

      return this.backend.insert<TOutput>(segment, jsonPayload);
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Performs a high-performance batch insert mutation sweep across remote endpoints.
   * Converts the dataset to NDJSON lines via the high-utility Backend chunk streamer.
   */
  public insertBulk<TInput = any, TOutput = any>(
    table: SQLiteTable<any>, // 🌟 Bound cleanly to the root class type definition
    payloads: TInput[]
  ): Observable<TOutput[]> {
    try {
      const tableName = getTableName(table);

      // 🌟 RESILIENT CARD GUARD: Returns instantly so cloud installs skip reference data bloat
      if (tableName === 'cards') {
        return of([]);
      }

      // 🌟 FIX: Look up endpoints and mappers cleanly using string name identifiers
      const segment = this.endpointRegistry.get(tableName);
      if (!segment) {
        return throwError(() => new Error(`[CloudDataWire] Unmapped table schema signature for insertBulk: "${tableName}".`));
      }

      if (!payloads || payloads.length === 0) {
        return of([]);
      }

      const serializer = this.serializerRegistry.get(tableName);
      const jsonPayloads = serializer ? payloads.map(p => serializer(p)) : payloads;

      // Streams data down the NDJSON pipeline natively
      return this.backend.streamJsonRecordsToServer(from(jsonPayloads), `${segment}/bulk-insert`).pipe(
        map(() => payloads as unknown as TOutput[])
      );
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Pushes partial field updates to modification REST endpoints by unique identifier.
   */
  public update(
    table: SQLiteTable<any>, // 🌟 Bound cleanly to the root class type definition
    id: string | number,
    payload: any // Accepts loose delta tracking update frames objects
  ): Observable<void> {
    try {
      const tableName = getTableName(table);

      if (tableName === 'cards') {
        return of(void 0);
      }

      // 🌟 FIX: Extract strings to navigate cross-route registry keys seamlessly
      const segment = this.endpointRegistry.get(tableName);
      if (!segment) {
        return throwError(() => new Error(`[CloudDataWire] Unmapped table schema signature submitted to update: "${tableName}".`));
      }

      const serializer = this.serializerRegistry.get(tableName);
      const jsonPayload = serializer ? serializer(payload) : payload;

      return this.backend.update<any>(segment, id, jsonPayload).pipe(map(() => void 0));
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Dispatches destructive elimination requests targeting unique primary identifiers over REST.
   */
  public delete(
    table: SQLiteTable<any>, // 🌟 Bound cleanly to the root class type definition
    id: string | number
  ): Observable<void> {
    try {
      const tableName = getTableName(table);

      if (tableName === 'cards') {
        return of(void 0);
      }

      // 🌟 FIX: Extract strings to navigate cross-route registry keys seamlessly
      const segment = this.endpointRegistry.get(tableName);
      if (!segment) {
        return throwError(() => new Error(`[CloudDataWire] Unmapped table schema signature submitted to delete: "${tableName}".`));
      }

      return this.backend.delete(segment, id);
    } catch (err) {
      return throwError(() => err);
    }
  }

  /**
   * Extracts data array collections down from cloud server nodes and auto-hydrates domain models.
   */
  public fetchCollection<TOutput = any>(
    table: SQLiteTable<any>, // 🌟 Bound cleanly to the root class type definition, keeping TOutput for features
    contextId?: string | number
  ): Observable<TOutput[]> {
    try {
      const tableName = getTableName(table);

      // 🌟 THE FALLBACK TRIGGER: Returning an empty array signals the SetService
      // that it must immediately fire its internal fallback to fetch fresh cards from Scryfall
      if (tableName === 'cards') {
        return of([]);
      }

      // 🌟 FIX: Extract strings to navigate cross-route registry keys seamlessly
      const segment = this.endpointRegistry.get(tableName);
      if (!segment) {
        return throwError(() => new Error(`[CloudDataWire] Unmapped table schema signature submitted to fetchCollection: "${tableName}".`));
      }

      return this.backend.fetchCollection<any>(segment, contextId ?? 'all').pipe(
        map((payloads: any[]) => {
          const activeHydrator = this.hydratorRegistry.get(tableName);

          // AUTOMATIC HYDRATION: Emits clean domain model arrays natively!
          return activeHydrator
            ? payloads.map((json) => activeHydrator(json))
            : (payloads as TOutput[]);
        })
      );
    } catch (err) {
      return throwError(() => err);
    }
  }
}
