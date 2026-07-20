// src/app/core/sqlite/sqlite.schema.ts
import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';

// ==========================================
// STATIC RELATIONAL CORE
// ==========================================
export const sets = sqliteTable('sets', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
}, (table) => [
  index('sets_name_idx').on(table.name),
]);

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
  action: text('action').$type<'CREATE' | 'UPDATE' | 'DELETE'>().notNull(),
  payload: text('payload', { mode: 'json' }).$type<any>().notNull(),
  createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
});

// ==========================================
// INFERRED TYPES
// ==========================================
export type SetEntity = typeof sets.$inferSelect;
export type CardEntity = typeof cards.$inferSelect;
export type DeckEntity = typeof decks.$inferSelect;
