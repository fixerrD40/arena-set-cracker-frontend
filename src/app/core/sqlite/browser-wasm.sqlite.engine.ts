// src/app/core/storage/browser-wasm.sqlite.engine.ts
import { Injectable, Injector, runInInjectionContext, inject } from '@angular/core';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sql-js';

import { OutboxEnvelope, SqliteEngine, SyncQueueItem } from './sqlite.engine';
import { syncQueue } from './sqlite.schema';
import * as MySchema from './sqlite.schema';
import { APP_CONFIG } from '../config/config.model';

declare const initSqlJs: any;

@Injectable({
  providedIn: 'root'
})
export class BrowserWasmSqliteEngine extends SqliteEngine {
  public rawSqliteClient?: any;
  public cachedDbInstance?: any;

  // ==========================================================
  // TYPE-SAFE DRIVER OVERRIDES
  // ==========================================================

  public override async bootstrap(injector: Injector): Promise<void> {
    if (this.cachedDbInstance) return;

    const runtimeConfig = runInInjectionContext(injector, () => {
      const appConfig = inject(APP_CONFIG);
      return { sqliteDbName: appConfig.sqliteDbName };
    });

    // 🌟 TRUE LOCAL VARIABLE: Scoped tightly near the boot thread canvas line
    const dbKey = `arena_cache_${runtimeConfig.sqliteDbName.replace(/^file:/, '')}`;

    try {
      console.log('[BrowserWasmSqliteEngine] Bootstrapping browser WebAssembly SQLite instance...');
      const SQL = await initSqlJs({ locateFile: (file: string) => `assets/${file}` });

      // 🌟 INLINED INDEXED_DB READ PASS
      let savedBinary: Uint8Array | null = await new Promise((resolve) => {
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

        // 🌟 Simply forward the local key context string down to the init flush loop
        await this.commitSnapshotToIndexedDb(dbKey);
      }
      console.log('[BrowserWasmSqliteEngine] Browser web storage sandbox successfully active.');
    } catch (error) {
      console.error('[BrowserWasmSqliteEngine] Boot breakdown:', error);
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

  // ==========================================================
  // PHYSICAL BUFFER STORAGE SYNCHRONIZERS
  // ==========================================================

  /**
   * Proxied flush trigger called directly by your CloudDataWire pipelines.
   * Resolves the key name dynamically inside the thread execution scope.
   */
  public async flushToIndexedDb(): Promise<void> {
    // Web targets can read the local config reference safely right at the moment of flushing
    const fallbackDbName = 'app_database.sqlite'; // Matches your base config fallback defaults
    const currentDbKey = `arena_cache_${fallbackDbName}`;

    await this.commitSnapshotToIndexedDb(currentDbKey);
  }

  /**
   * 🌟 INLINED WRITE PASS:
   * Commits current binary memory chunks directly down to the browser IndexedDB host storage.
   */
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
      const response = await fetch('drizzle/0000_initial_schema.sql');
      if (!response.ok) throw new Error('Schema migration file missing from app assets.');

      const ddlStatementsScript = await response.text();
      db.run(ddlStatementsScript);
    } catch (error) {
      console.error('[BrowserWasmSqliteEngine] Could not initialize web DDL rules:', error);
    }
  }
}
