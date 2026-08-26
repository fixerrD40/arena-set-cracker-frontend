import { Injectable, Injector, runInInjectionContext, inject } from '@angular/core';
import { APP_CONFIG } from '../config/config.model';
import { syncQueue } from './sqlite.schema';
import * as MySchema from './sqlite.schema';
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';
import { OutboxEnvelope, SqliteEngine, SyncQueueItem } from './sqlite.engine';

@Injectable({
  providedIn: 'root'
})
export class NativeSqliteEngine extends SqliteEngine {
  public rawSqliteClient?: any;
  public cachedDbInstance?: any;
  public activeFileName?: string;

  public override async bootstrap(injector: Injector): Promise<void> {
    if (this.cachedDbInstance) return;

    const runtimeConfig = runInInjectionContext(injector, () => {
      const appConfig = inject(APP_CONFIG);
      return {
        sqliteDbName: appConfig.sqliteDbName,
        baseUrl: appConfig.baseUrl
      };
    });

    this.activeFileName = runtimeConfig.sqliteDbName.replace(/^file:/, '');

    const globalWindow = window as any;
    if (!globalWindow.require || !globalWindow.process) {
      throw new Error('[SqliteEngine] Environment verification failed: Missing Node shell context objects.');
    }

    const nodeRequire = globalWindow.require;
    try {
      const fs = nodeRequire('fs');
      const path = nodeRequire('path');
      const process = globalWindow.process;

      const targetPath = path.join(process.cwd(), this.activeFileName);
      const SQL = await initSqlJs({ locateFile: (file: string) => `assets/${file}` });

      if (fs.existsSync(targetPath)) {
        const rawBuffer = fs.readFileSync(targetPath);
        const bytes = new Uint8Array(rawBuffer);

        this.rawSqliteClient = new SQL.Database(bytes);
        this.cachedDbInstance = drizzle(this.rawSqliteClient, { schema: MySchema });

        console.log(`[SqliteEngine] High-speed Drizzle client loaded via require: [${this.activeFileName}].`);
      } else {
        console.log(`[SqliteEngine] Database container file missing. Compiling schema layout...`);

        this.rawSqliteClient = new SQL.Database();
        this.cachedDbInstance = drizzle(this.rawSqliteClient, { schema: MySchema });

        this.generateDatabaseSchema(this.rawSqliteClient);
        this.flush();
      }
    } catch (rootError) {
      console.error('[SqliteEngine] Critical failure during desktop engine initialization pass:', rootError);
      throw rootError;
    }
  }

  public async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const db = this.cachedDbInstance;
    if (!db) {
      console.warn('[SqliteEngine] Sync lookup aborted: Database uninitialized.');
      return [];
    }
    try {
      return db.select().from(syncQueue).orderBy(syncQueue.id).all() as SyncQueueItem[];
    } catch (error) {
      console.error('[SqliteEngine] Failed to read pending outbox logs:', error);
      return [];
    }
  }

  public async clearSyncItemsBatch(ids: number[]): Promise<void> {
    const db = this.cachedDbInstance;
    if (!db || ids.length === 0) return;
    try {
      db.delete(syncQueue)
        .where(inArray(syncQueue.id, ids))
        .run();

      this.flush();
    } catch (error) {
      console.error('[SqliteEngine] Failed to execute atomic batch purge on disk:', error);
      throw error;
    }
  }

  public async enqueueSyncItem(item: OutboxEnvelope): Promise<void> {
    const db = this.cachedDbInstance;
    if (!db) {
      console.warn('[SqliteEngine] SQLite database instance uninitialized.');
      return;
    }

    const payloadId = String(item.payload?.id);
    if (!payloadId) {
      console.error('[SqliteEngine] Enqueue aborted: Payload lacks unique ID.');
      return;
    }

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

      this.flush();
    } catch (err) {
      console.error('[SqliteEngine] Database upsert failure:', err);
      throw err;
    }
  }

  public flush(): void {
    const rawDb = this.rawSqliteClient;
    const fileName = this.activeFileName;
    if (!rawDb || !fileName) return;

    try {
      const globalWindow = window as any;
      const nodeRequire = globalWindow.require;
      const fs = nodeRequire('fs');
      const path = nodeRequire('path');
      const process = globalWindow.process;

      const { Buffer } = nodeRequire('buffer') as any;

      const data = rawDb.export();
      const buffer = Buffer.from(data);

      fs.writeFileSync(path.join(process.cwd(), fileName), buffer);
      console.log(`[SqliteEngine] Memory cache state successfully persisted to disk: [${fileName}].`);
    } catch (error) {
      console.error('[SqliteEngine] Critical failure writing binary block to disk:', error);
    }
  }

  private generateDatabaseSchema(db: any): void {
    try {
      const globalWindow = window as any;
      const nodeRequire = globalWindow.require;
      const fs = nodeRequire('fs');
      const path = nodeRequire('path');
      const process = globalWindow.process;

      const targetDirectory = fs.existsSync(path.join(process.cwd(), 'public', 'drizzle'))
        ? path.join(process.cwd(), 'public', 'drizzle')
        : path.join(process.cwd(), 'dist', 'arena-set-cracker', 'browser', 'drizzle');

      if (!fs.existsSync(targetDirectory)) {
        throw new Error(`[SqliteEngine] Missing schema directory at [${targetDirectory}].`);
      }

      const files = fs.readdirSync(targetDirectory);
      const initMigrationFile = files.find((file: string) => file.startsWith('0000_') && file.endsWith('.sql'));

      if (!initMigrationFile) {
        throw new Error(`[SqliteEngine] DDL file missing inside directory: [${targetDirectory}]`);
      }

      const sqlScriptPath = path.join(targetDirectory, initMigrationFile);
      const ddlStatementsScript = fs.readFileSync(sqlScriptPath, 'utf8');
      const cleaned = ddlStatementsScript.replace(/-->\s*statement-breakpoint/g, '');

      db.run(cleaned);
      console.log(`[SqliteEngine] Database schema successfully initialized via: [${initMigrationFile}].`);
    } catch (ddlError: any) {
      console.error('[SqliteEngine] Error initializing database schema:', ddlError?.message || ddlError);
      throw ddlError;
    }
  }
}
