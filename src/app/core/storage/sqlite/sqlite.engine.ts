// src/app/core/storage/sqlite/sqlite.engine.ts
import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { SQLiteTable, getTableConfig } from 'drizzle-orm/sqlite-core';
import initSqlJs from 'sql.js';

// Core Schema and Dialect Configuration Imports
import * as MySchema from './sqlite.schema';
import { getTableName, is } from 'drizzle-orm';
import { APP_CONFIG } from '../../config/app.config.token';
import { DESKTOP_CONFIG } from '../../config/desktop.config.token';
import { drizzle } from 'drizzle-orm/sql-js';

@Injectable({
  providedIn: 'root'
})
export class SqliteEngine {
  public cachedDbInstance?: any;
  public activeFileName?: string;

  /**
   * HIGH-PERFORMANCE BOOTSTRAPPER
   * Resolves filesystem binaries securely using the global runtime require wire.
   */
  public async bootstrapEngine(injector: Injector): Promise<void> {
    if (this.cachedDbInstance) return;

    const runtimeConfig = runInInjectionContext(injector, () => {
      const appConfig = inject(APP_CONFIG, { optional: true });
      const desktopConfig = inject(DESKTOP_CONFIG, { optional: true });

      return {
        sqliteDbName: desktopConfig?.sqliteDbName ?? 'app_database.sqlite',
        baseUrl: appConfig?.baseUrl ?? ''
      } as { sqliteDbName: string; baseUrl: string };
    });

    this.activeFileName = runtimeConfig.sqliteDbName.replace(/^file:/, '');

    // 🌟 THE RUNTIME NODE DETECTOR: Verifies if the injected require hook is active
    const nodeRequire = (window as any).require;
    const isElectronHost = !!(nodeRequire && (window as any).process?.versions?.electron);

    // WEB & MOBILE FALLBACK: Initializes a pure, fluid in-memory WASM storage grid
    if (!isElectronHost) {
      console.warn('[SqliteEngine] Client running outside native desktop shell. Initializing transient WASM memory engine.');
      const SQL = await initSqlJs({ locateFile: (file: string) => `assets/${file}` });
      this.cachedDbInstance = new SQL.Database();
      return;
    }

    try {
      const fs = nodeRequire('fs');
      const path = nodeRequire('path');
      const process = (window as any).process;

      const targetPath = path.join(process.cwd(), this.activeFileName);
      const SQL = await initSqlJs({ locateFile: (file: string) => `assets/${file}` });

      if (fs.existsSync(targetPath)) {
        const rawBuffer = fs.readFileSync(targetPath);
        const bytes = new Uint8Array(rawBuffer);

        const freshDb = new SQL.Database(bytes);

        // 🌟 FIX: Wrap the raw database instance inside Drizzle's proxy engine!
        this.cachedDbInstance = drizzle(freshDb);

        console.log(`[SqliteEngine] High-speed Drizzle client loaded via require: [${this.activeFileName}].`);
      } else {
        console.log(`[SqliteEngine] Database container file missing. Compiling schema layout...`);
        const freshDb = new SQL.Database();

        // 🌟 FIX: Wrap it inside Drizzle here as well before generating tables!
        this.cachedDbInstance = drizzle(freshDb);

        this.generateDatabaseSchema(freshDb);
      }
    } catch (rootError) {
      console.error('[SqliteEngine] Critical failure during desktop engine initialization pass:', rootError);
      throw rootError;
    }
  }


  /**
   * HIGH-PERFORMANCE PHYSICAL FLUSH
   * Synchronizes the in-memory WASM database heap straight onto native disk storage blocks.
   */
  public flush(): void {
    const db = this.cachedDbInstance;
    const fileName = this.activeFileName;
    if (!db || !fileName) return;

    const nodeRequire = (window as any).require;
    const isElectronHost = !!(nodeRequire && (window as any).process?.versions?.electron);

    if (!isElectronHost) {
      console.warn('[SqliteEngine] Flush skipped: Engine context is transient in a web browser environment.');
      return;
    }

    try {
      const fs = nodeRequire('fs');
      const path = nodeRequire('path');
      const process = (window as any).process;

      const data = db.export();
      const buffer = Buffer.from(data);

      fs.writeFileSync(path.join(process.cwd(), fileName), buffer);
      console.log(`[SqliteEngine] Database successfully persisted to disk via require channel: [${fileName}].`);
    } catch (error) {
      console.error('[SqliteEngine] Critical failure writing binary block to disk:', error);
    }
  }

  /**
   * Compiles your static Drizzle schemas into live SQLite tables inside the WASM instance.
   */
  private generateDatabaseSchema(db: any): void {
    const tables = Object.values(MySchema).filter(
      (item: any): item is SQLiteTable<any> => is(item, SQLiteTable)
    );
    const ddlStatements: string[] = [];

    for (const table of tables) {
      const name = getTableName(table);
      const { columns, indexes, foreignKeys } = getTableConfig(table);
      const columnDefinitions: string[] = [];
      const primaryKeyColumns: string[] = [];

      for (const col of columns) {
        let def = `"${col.name}" ${col.getSQLType()}`;
        if (col.notNull) def += ' NOT NULL';
        if (col.primary) {
          if (name === 'sync_queue') def += ' PRIMARY KEY AUTOINCREMENT';
          else primaryKeyColumns.push(`"${col.name}"`);
        }
        if (col.hasDefault && typeof col.default !== 'function') {
          def += ` DEFAULT ${typeof col.default === 'string' ? `'${col.default}'` : col.default}`;
        }
        columnDefinitions.push(def);
      }

      if (primaryKeyColumns.length > 0 && name !== 'sync_queue') {
        columnDefinitions.push(`PRIMARY KEY (${primaryKeyColumns.join(', ')})`);
      }

      if (foreignKeys && foreignKeys.length > 0) {
        for (const fk of foreignKeys) {
          const reference = fk.reference();
          const localCols = reference.columns.map((c: any) => `"${c.name}"`).join(', ');
          const foreignCols = reference.foreignColumns.map((c: any) => `"${c.name}"`).join(', ');
          const foreignTable = getTableName(reference.foreignTable);
          let fkDef = `FOREIGN KEY (${localCols}) REFERENCES "${foreignTable}"(${foreignCols})`;
          if ((fk as any).onDelete) fkDef += ` ON DELETE ${(fk as any).onDelete.toUpperCase()}`;
          columnDefinitions.push(fkDef);
        }
      }

      ddlStatements.push(`CREATE TABLE IF NOT EXISTS "${name}" (\n ${columnDefinitions.join(',\n ')}\n);`);

      for (const idx of indexes) {
        const indexColumns = idx.config.columns.map((c: any) => `"${c.name}"`).join(', ');
        const uniqueMarker = idx.config.unique ? 'UNIQUE ' : '';
        ddlStatements.push(`CREATE ${uniqueMarker}INDEX IF NOT EXISTS "${idx.config.name}" ON "${name}" (${indexColumns});`);
      }
    }

    db.run(ddlStatements.join('\n'));
    console.log('[SqliteEngine] Static schema DDL compilation executed successfully.');

    // Commit adjustments to disk instantly
    this.flush();
  }
}
