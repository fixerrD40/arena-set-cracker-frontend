// src/app/core/sqlite/sqlite.schema.ts
import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ==========================================
// SYSTEM LAYERS & MACHINE STATE CONFIG (Singleton)
// ==========================================
export const systemConfig = sqliteTable('system_config', {
  // Hardcoded key constraint guarantees only one configuration context exists inside SQLite
  id: text('id').primaryKey().default('active_user'),
  displayName: text('display_name').notNull(),

  // 🔑 The sole cryptographically secure gatekeeper string needed for data syncing
  sessionToken: text('session_token'),

  isCloudSynced: integer('is_cloud_synced', { mode: 'boolean' }).notNull().default(false),
  lastSyncTimestamp: text('last_sync_timestamp'),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`)
});

// ==========================================
// STATIC RELATIONAL CORE
// ==========================================
export const sets = sqliteTable('sets', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g., "dsk", "blb", "ltr"
  name: text('name').notNull(),
  iconSvgUri: text('icon_svg_uri').notNull(),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`)
});

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(),
  setId: text('set_id').notNull().references(() => sets.id, { onDelete: 'cascade' }),
  arenaId: integer('arena_id').notNull(),
  scryfallId: text('scryfall_id').notNull(),
  name: text('name').notNull(),
  localArtUri: text('local_art_uri').notNull(),
  typeLine: text('type_line').notNull(),
  colors: text('colors', { mode: 'json' }).$type<string[]>().notNull(),
  rarity: text('rarity').notNull(),
  manaCost: text('mana_cost').notNull(),
});

// ==========================================
// DYNAMIC USER CORE
// ==========================================
export const decks = sqliteTable('decks', {
  id: text('id').primaryKey(),
  setId: text('set_id').notNull().references(() => sets.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().$default(() => []),
  notes: text('notes').notNull().default(''),
  createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
});

export const deckCards = sqliteTable('deck_cards', {
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  cardId: text('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
}, (table) => [
  primaryKey({ columns: [table.deckId, table.cardId] }),
]);

// ==========================================
// OFFLINE SYNC QUEUE (Outbox Pattern)
// ==========================================
export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').$type<'set' | 'deck'>().notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').$type<'CREATE' | 'UPDATE' | 'DELETE'>().notNull(),
  payload: text('payload', { mode: 'json' }).$type<any>().notNull(),
  createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex('sync_queue_entity_record_idx').on(table.entityType, table.entityId)
]);

// ==========================================
// INFERRED DATABASE DATA SHAPES
// ==========================================

/** Selection Records (What comes OUT of the database) */
export type SystemConfigRow = typeof systemConfig.$inferSelect; // 🌟 Added
export type SetRow = typeof sets.$inferSelect;
export type CardRow = typeof cards.$inferSelect;
export type DeckRow = typeof decks.$inferSelect;
export type DeckCardRow = typeof deckCards.$inferSelect;
export type SyncQueueRow = typeof syncQueue.$inferSelect;

/** Insertion Payloads (What goes IN to the database) */
export type SystemConfigInsert = typeof systemConfig.$inferInsert; // 🌟 Added
export type SetInsert = typeof sets.$inferInsert;
export type CardInsert = typeof cards.$inferInsert;
export type DeckInsert = typeof decks.$inferInsert;
export type DeckCardInsert = typeof deckCards.$inferInsert;
export type SyncQueueInsert = typeof syncQueue.$inferInsert;
