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

// Headless Drizzle Schema Constants for Route Verification
import { sets, cards, decks } from '../../storage/sqlite/sqlite.schema';

@Injectable({
  providedIn: 'root',
})
export class CloudDataWire implements DataWire {
  private readonly backend = inject(BackendService);

  /**
   * Symmetrical Endpoint Registry.
   * Maps abstract headless Drizzle table tokens directly to their remote REST paths.
   */
  private readonly endpointRegistry = new Map<any, string>([
    [sets, 'sets'],
    [decks, 'decks']
  ]);

  /** Internal registry mapping table schema tokens to Web/JSON REST API serializers */
  private readonly serializerRegistry = new Map<any, (domain: any) => any>([
    [sets, serializeSetToJSON],
    [cards, mapCardToJson],
    [decks, mapDeckToJson]
  ]);

  /** Internal registry mapping table schema tokens to network payload hydrators */
  private readonly hydratorRegistry = new Map<any, (json: any) => any>([
    [sets, mapJsonToSet],
    [cards, mapJsonToCard],
    [decks, mapJsonToDeck]
  ]);

  /**
   * Performs a single payload record mutation across the remote server API.
   * Serializes the domain object to a network payload literal before transport.
   */
  public insert<TTable extends SQLiteTable<any>, TInput = any, TOutput = any>(
    table: TTable,
    domainModel: TInput
  ): Observable<TOutput> {
    // 🌟 RESILIENT CARD GUARD: Cloud completely ignores card writes
    if (getTableName(table) === 'cards') {
      return of(domainModel as unknown as TOutput);
    }

    const segment = this.endpointRegistry.get(table);
    if (!segment) {
      return throwError(() => new Error(`[CloudDataWire] Unmapped table schema signature submitted to insert.`));
    }

    const serializer = this.serializerRegistry.get(table);
    const jsonPayload = serializer ? serializer(domainModel) : domainModel;

    return this.backend.insert<TOutput>(segment, jsonPayload);
  }

  /**
   * Performs a high-performance batch insert mutation sweep across remote endpoints.
   * Converts the dataset to NDJSON lines via the high-utility Backend chunk streamer.
   */
  public insertBulk<TTable extends SQLiteTable<any>, TInput = any, TOutput = any>(
    table: TTable,
    payloads: TInput[]
  ): Observable<TOutput[]> {
    // 🌟 RESILIENT CARD GUARD: Returns instantly so cloud installs skip reference data bloat
    if (getTableName(table) === 'cards') {
      return of([]);
    }

    const segment = this.endpointRegistry.get(table);
    if (!segment) {
      return throwError(() => new Error(`[CloudDataWire] Unmapped table schema signature.`));
    }

    if (!payloads || payloads.length === 0) {
      return of([]);
    }

    const serializer = this.serializerRegistry.get(table);
    const jsonPayloads = serializer ? payloads.map(p => serializer(p)) : payloads;

    return this.backend.streamJsonRecordsToServer(from(jsonPayloads), `${segment}/bulk-insert`).pipe(
      map(() => payloads as unknown as TOutput[])
    );
  }

  /**
   * Pushes partial field updates to modification REST endpoints by unique identifier.
   */
  public update<TTable extends SQLiteTable<any>>(
    table: TTable,
    id: string | number,
    payload: any // Accepts loose delta tracking update frames objects
  ): Observable<void> {
    if (getTableName(table) === 'cards') {
      return of(void 0);
    }

    const segment = this.endpointRegistry.get(table);
    if (!segment) {
      return throwError(() => new Error(`[CloudDataWire] Unmapped table schema signature submitted to update.`));
    }

    const serializer = this.serializerRegistry.get(table);
    const jsonPayload = serializer ? serializer(payload) : payload;

    return this.backend.update<any>(segment, id, jsonPayload).pipe(map(() => void 0));
  }

  /**
   * Dispatches destructive elimination requests targeting unique primary identifiers over REST.
   */
  public delete<TTable extends SQLiteTable<any>>(
    table: TTable,
    id: string | number
  ): Observable<void> {
    if (getTableName(table) === 'cards') {
      return of(void 0);
    }

    const segment = this.endpointRegistry.get(table);
    if (!segment) {
      return throwError(() => new Error(`[CloudDataWire] Unmapped table schema signature submitted to delete.`));
    }

    return this.backend.delete(segment, id);
  }

  /**
   * Extracts data array collections down from cloud server nodes and auto-hydrates domain models.
   */
  public fetchCollection<TTable extends SQLiteTable<any>, TOutput = any>(
    table: TTable,
    contextId?: string | number
  ): Observable<TOutput[]> {
    // 🌟 THE FALLBACK TRIGGER: Returning an empty array signals the SetService
    // that it must immediately fire its internal fallback to fetch fresh cards from Scryfall
    if (getTableName(table) === 'cards') {
      return of([]);
    }

    const segment = this.endpointRegistry.get(table);
    if (!segment) {
      return throwError(() => new Error(`[CloudDataWire] Unmapped table schema signature submitted to fetchCollection.`));
    }

    return this.backend.fetchCollection<any>(segment, contextId ?? 'all').pipe(
      map((payloads: any[]) => {
        const activeHydrator = this.hydratorRegistry.get(table);
        // 🌟 AUTOMATIC HYDRATION: Emits clean domain model arrays natively!
        return activeHydrator
          ? payloads.map((json) => activeHydrator(json))
          : (payloads as TOutput[]);
      })
    );
  }
}
