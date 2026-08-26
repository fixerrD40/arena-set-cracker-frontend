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
  abstract bootstrap(injector: Injector): Promise<void>;
  abstract getPendingSyncItems(): Promise<SyncQueueItem[]>;
  abstract clearSyncItemsBatch(ids: number[]): Promise<void>;
  /** Upserts an outbox row so later mutations for the same entity squash earlier ones. */
  abstract enqueueSyncItem(envelope: OutboxEnvelope): Promise<void>;
}

export const SQLITE_ENGINE_TOKEN = new InjectionToken<SqliteEngine>('SQLITE_ENGINE_TOKEN');
