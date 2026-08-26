import { Injectable, Injector, runInInjectionContext, inject } from '@angular/core';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';

import { OutboxEnvelope, SqliteEngine, SyncQueueItem } from './sqlite.engine';
import { syncQueue } from './sqlite.schema';
import * as MySchema from './sqlite.schema';
import { APP_CONFIG } from '../config/config.model';

@Injectable({
  providedIn: 'root'
})
export class BrowserWasmSqliteEngine extends SqliteEngine {
  public rawSqliteClient?: any;
  public cachedDbInstance?: any;
  private activeDbKey?: string;

  public override async bootstrap(injector: Injector): Promise<void> {
    if (this.cachedDbInstance) return;

    const runtimeConfig = runInInjectionContext(injector, () => {
      const appConfig = inject(APP_CONFIG);
      return { sqliteDbName: appConfig.sqliteDbName };
    });

    const dbKey = `arena_cache_${runtimeConfig.sqliteDbName.replace(/^file:/, '')}`;
    this.activeDbKey = dbKey;

    try {
      console.log('[BrowserWasmSqliteEngine] Bootstrapping browser WebAssembly SQLite instance...');
      const SQL = await initSqlJs({ locateFile: (file: string) => `assets/${file}` });

      const savedBinary: Uint8Array | null = await new Promise((resolve) => {
        const request = indexedDB.open('ArenaWebCacheDB', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('kv_store');
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('kv_store', 'readonly');
          const getReq = transaction.objectStore('kv_store').get(dbKey);
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        };
        request.onerror = () => resolve(null);
      });

      if (savedBinary) {
        console.log(`[BrowserWasmSqliteEngine] Container cache [${dbKey}] hydrated successfully.`);
        this.rawSqliteClient = new SQL.Database(savedBinary);
      } else {
        console.log('[BrowserWasmSqliteEngine] Container cache missing. Building fresh structural schema layout...');
        this.rawSqliteClient = new SQL.Database();
      }

      this.cachedDbInstance = drizzle(this.rawSqliteClient, { schema: MySchema });

      if (!savedBinary) {
        await this.generateWebDatabaseSchema(this.rawSqliteClient);
        await this.commitSnapshotToIndexedDb(dbKey);
      }
      console.log('[BrowserWasmSqliteEngine] Browser web storage sandbox successfully active.');
    } catch (error) {
      console.error('[BrowserWasmSqliteEngine] Boot breakdown:', error);
      throw error;
    }
  }

  public async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    if (!this.cachedDbInstance) return [];
    return this.cachedDbInstance.select().from(syncQueue).orderBy(syncQueue.id).all();
  }

  public async clearSyncItemsBatch(ids: number[]): Promise<void> {
    const db = this.cachedDbInstance;
    if (!db || ids.length === 0) return;
    db.delete(syncQueue).where(inArray(syncQueue.id, ids)).run();
    await this.flushToIndexedDb();
  }

  public async enqueueSyncItem(item: OutboxEnvelope): Promise<void> {
    const db = this.cachedDbInstance;
    if (!db) return;

    const payloadId = String(item.payload?.id);
    if (!payloadId) return;

    try {
      if (item.action === 'DELETE') {
        db.delete(syncQueue)
          .where(and(eq(syncQueue.entityType, item.entityType), eq(syncQueue.entityId, payloadId)))
          .run();
      }

      db.insert(syncQueue)
        .values({
          entityType: item.entityType,
          entityId: payloadId,
          action: item.action,
          payload: item.payload
        })
        .onConflictDoUpdate({
          target: [syncQueue.entityType, syncQueue.entityId],
          set: {
            action: item.action,
            payload: item.payload,
            createdAt: new Date().toISOString()
          }
        })
        .run();

      await this.flushToIndexedDb();
    } catch (err) {
      console.error('[BrowserWasmSqliteEngine] Transaction crash:', err);
      throw err;
    }
  }

  /** Alias used by CloudDataWire.flush() — matches NativeSqliteEngine.flush naming. */
  public flush(): void {
    void this.flushToIndexedDb();
  }

  public async flushToIndexedDb(): Promise<void> {
    const currentDbKey = this.activeDbKey ?? 'arena_cache_mtg_vault.db';
    await this.commitSnapshotToIndexedDb(currentDbKey);
  }

  private async commitSnapshotToIndexedDb(targetDbKey: string): Promise<void> {
    if (!this.rawSqliteClient) return;

    try {
      const binaryData = this.rawSqliteClient.export();

      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('ArenaWebCacheDB', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('kv_store');
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('kv_store', 'readwrite');
          const putReq = transaction.objectStore('kv_store').put(binaryData, targetDbKey);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        };
        request.onerror = () => reject(request.error);
      });

      console.log(`[BrowserWasmSqliteEngine] Memory state successfully flushed to storage key: [${targetDbKey}].`);
    } catch (error) {
      console.error('[BrowserWasmSqliteEngine] Critical failure synchronizing binary blocks to browser cache:', error);
    }
  }

  private async generateWebDatabaseSchema(db: any): Promise<void> {
    try {
      const journalResponse = await fetch('drizzle/meta/_journal.json');
      if (!journalResponse.ok) {
        throw new Error('Drizzle journal missing from app assets.');
      }

      const journal = await journalResponse.json();
      const tag = journal?.entries?.[0]?.tag;
      if (!tag) {
        throw new Error('Drizzle journal has no initial migration tag.');
      }

      const response = await fetch(`drizzle/${tag}.sql`);
      if (!response.ok) {
        throw new Error(`Schema migration file missing: drizzle/${tag}.sql`);
      }

      const ddlStatementsScript = await response.text();
      // sql.js can run multi-statement scripts; strip drizzle breakpoints
      const cleaned = ddlStatementsScript.replace(/-->\s*statement-breakpoint/g, '');
      db.run(cleaned);
      console.log(`[BrowserWasmSqliteEngine] Schema initialized via: [${tag}.sql].`);
    } catch (error) {
      console.error('[BrowserWasmSqliteEngine] Could not initialize web DDL rules:', error);
      throw error;
    }
  }
}
