// src/app/core/storage/sqlite/sqlite.registry.ts
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { getTableName } from 'drizzle-orm';

// ==========================================================
// 1. REPLICATE YOUR LITERAL SERIALIZERS / HYDRATORS
// ==========================================================

export function serializeSetToSqlite(domain: any): any {
  return { id: domain.id, code: domain.code, name: domain.name };
}
export function mapCardToInsert(domain: any): any { return domain; }
export function mapDeckToInsert(domain: any): any { return domain; }

export function mapRowToSet(raw: any): any { return raw; }
export function mapRowToCard(raw: any): any { return raw; }
export function mapRowToDeck(raw: any): any { return raw; }

// ==========================================================
// 2. CONSOLIDATED STATIC REGISTRIES
// ==========================================================

const serializerRegistry = new Map<string, (domain: any) => any>([
  ['sets', serializeSetToSqlite],
  ['cards', mapCardToInsert],
  ['decks', mapDeckToInsert]
]);

const hydratorRegistry = new Map<string, (raw: Record<string, any>) => any>([
  ['sets', mapRowToSet],
  ['cards', mapRowToCard],
  ['decks', mapRowToDeck]
]);

// ==========================================================
// 3. EXPLICIT LOOKUP UTILITIES
// ==========================================================

/**
 * Traverses table metadata and extracts the registered database insertion transformer.
 */
export function serializePayload(table: SQLiteTable<any>, domainModel: any): any {
  const tableName = getTableName(table);
  const serializer = serializerRegistry.get(tableName);
  return serializer ? serializer(domainModel) : domainModel;
}

/**
 * Traverses table metadata ONCE, extracts the active serialization transformer,
 * and efficiently loops across an entire collection of domain models in a single pass.
 */
export function serializePayloadsBulk(table: SQLiteTable<any>, domainModels: any[]): any[] {
  if (!domainModels || domainModels.length === 0) return [];

  const tableName = getTableName(table);
  const serializer = serializerRegistry.get(tableName);

  // If a serializer exists, use it to map the whole array; otherwise return payloads untouched
  return serializer ? domainModels.map(model => serializer(model)) : domainModels;
}

/**
 * Traverses table metadata and translates raw SQLite rows into UI-friendly models.
 */
export function hydrateRow<T = any>(table: SQLiteTable<any>, rawRow: Record<string, any>): T {
  const tableName = getTableName(table);
  const hydrator = hydratorRegistry.get(tableName);
  return hydrator ? hydrator(rawRow) : (rawRow as T);
}
