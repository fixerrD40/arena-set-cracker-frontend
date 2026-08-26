// src/app/core/sqlite/sqlite.registry.ts
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { getTableName } from 'drizzle-orm';
import { serializeSetToSqlite, mapRowToSet } from '../../shared/models/set/set.mappers';
import { mapCardToInsert, mapRowToCard } from '../../shared/models/card/card.mappers';
import { mapDeckToInsert, mapRowToDeck } from '../../shared/models/deck/deck.mappers';
import { mapProfileToInsert, mapRowToProfile } from '../../shared/models/user/user.mappers';
import { DeckRow, SetRow, CardRow, SystemConfigRow } from './sqlite.schema';

const serializerRegistry = new Map<string, (domain: any) => any>([
  ['sets', serializeSetToSqlite],
  ['cards', mapCardToInsert],
  ['decks', mapDeckToInsert],
  ['system_config', mapProfileToInsert]
]);

const hydratorRegistry = new Map<string, (raw: Record<string, any>) => any>([
  ['sets', (raw) => mapRowToSet(raw as SetRow)],
  ['cards', (raw) => mapRowToCard(raw as CardRow)],
  ['decks', (raw) => mapRowToDeck(raw as DeckRow)],
  ['system_config', (raw) => mapRowToProfile(raw as SystemConfigRow)]
]);

export function serializePayload(table: SQLiteTable<any>, domainModel: any): any {
  const tableName = getTableName(table);
  const serializer = serializerRegistry.get(tableName);
  return serializer ? serializer(domainModel) : domainModel;
}

export function serializePayloadsBulk(table: SQLiteTable<any>, domainModels: any[]): any[] {
  if (!domainModels || domainModels.length === 0) return [];

  const tableName = getTableName(table);
  const serializer = serializerRegistry.get(tableName);
  return serializer ? domainModels.map((model) => serializer(model)) : domainModels;
}

export function hydrateRow<T = any>(table: SQLiteTable<any>, rawRow: Record<string, any>): T {
  const tableName = getTableName(table);
  const hydrator = hydratorRegistry.get(tableName);
  return hydrator ? hydrator(rawRow) : (rawRow as T);
}
