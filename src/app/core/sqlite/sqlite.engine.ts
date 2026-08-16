// src/app/core/storage/sqlite/sqlite.engine.ts
import { InjectionToken, Injector } from '@angular/core';

export interface OutboxEnvelope {
  entityType: 'set' | 'deck';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
}

export interface SyncQueueItem {
  id: number;
  entityType: 'set' | 'deck';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  createdAt: string;
}

export abstract class SqliteEngine {
  /**
   * 🌟 UNIFIED LIFECYCLE CONTROLLER:
   * Polymorphic boot signature allowing the application context initializer to fire
   * background file parsing loops identically on native desktop and web targets.
   */
  abstract bootstrap(injector: Injector): Promise<void>;

  /**
   * Retrieves pending database entries sorted chronologically by ID layout.
   */
  abstract getPendingSyncItems(): Promise<SyncQueueItem[]>;

  /**
   * Atomic batch purge block to clear synced records out of SQLite memory.
   */
  abstract clearSyncItemsBatch(ids: number[]): Promise<void>;

  /**
   * High-performance atomic upsert that folds offline database modifications together.
   */
  abstract enqueueSyncItem(envelope: OutboxEnvelope): Promise<void>;
}

// Transparent injection token mapping to your abstract base class
export const SQLITE_ENGINE_TOKEN = new InjectionToken<SqliteEngine>('SQLITE_ENGINE_TOKEN');
