// src/app/core/storage/sqlite/sqlite.engine.ts
import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import initSqlJs from 'sql.js';

// Core Schema and Dialect Configuration Imports
import * as MySchema from './sqlite.schema';
import { APP_CONFIG } from '../../config/app.config.token';
import { DESKTOP_CONFIG } from '../../config/desktop.config.token';
import { drizzle } from 'drizzle-orm/sql-js';

@Injectable({
  providedIn: 'root'
})
export class SqliteEngine {
  // 🌟 ARCHITECTURAL ALIGNMENT: Explicitly maintain both references for disk flushing loops
  public rawSqliteClient?: any;   // Holds the raw sql.js WASM Database instance for .export()
  public cachedDbInstance?: any;  // Holds the type-safe Drizzle Client proxy instance for data wires
  public activeFileName?: string;

  /**
   * HIGH-PERFORMANCE BOOTSTRAPPER
   * Executes ONLY within a verified Electron host container context.
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

    const nodeRequire = (window as any).require;
    try {
      const fs = nodeRequire('fs');
      const path = nodeRequire('path');
      const process = (window as any).process;

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

        // 🌟 FIX: If generateDatabaseSchema was marked async during your earlier compiler tests,
        // you MUST add the 'await' keyword here to lock out the execution thread!
        // If it is pure synchronous fs.readFileSync text compilation, running it inline is perfectly safe.
        this.generateDatabaseSchema(this.rawSqliteClient);

        // This will successfully serialize the tables layout data onto your physical drive
        this.flush();
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
    const rawDb = this.rawSqliteClient;
    const fileName = this.activeFileName;
    if (!rawDb || !fileName) return;

    try {
      const nodeRequire = (window as any).require;
      const fs = nodeRequire('fs');
      const path = nodeRequire('path');
      const process = (window as any).process;

      // Extract raw binary data buffers from WebAssembly and stream them down to file systems natively
      const data = rawDb.export();
      const buffer = Buffer.from(data);

      fs.writeFileSync(path.join(process.cwd(), fileName), buffer);
      console.log(`[SqliteEngine] Memory cache state successfully persisted to disk: [${fileName}].`);
    } catch (error) {
      console.error('[SqliteEngine] Critical failure writing binary block to disk:', error);
    }
  }

  /**
   * Compiles your static Drizzle schemas into live SQLite tables inside the WASM instance.
   */
  private generateDatabaseSchema(db: any): void {
    try {
      console.log('[SqliteEngine] Extracting pre-compiled database schema script layout...');

      const nodeRequire = (window as any).require;
      const fs = nodeRequire('fs');
      const path = nodeRequire('path');
      const process = (window as any).process;

      // Safe fallback directory mapping to accommodate development vs production distribution folder builds
      const targetDirectory = fs.existsSync(path.join(process.cwd(), 'public', 'drizzle'))
        ? path.join(process.cwd(), 'public', 'drizzle')
        : path.join(process.cwd(), 'dist', 'arena-set-cracker', 'browser', 'drizzle');

      if (!fs.existsSync(targetDirectory)) {
        throw new Error(`[SqliteEngine] Schema bootstrapper aborted: Directory missing at [${targetDirectory}]. Run 'npm run db:generate'.`);
      }

      const files = fs.readdirSync(targetDirectory);
      const initMigrationFile = files.find((file: string) => file.startsWith('0000_') && file.endsWith('.sql'));

      if (!initMigrationFile) {
        throw new Error(`[SqliteEngine] Initialization DDL file missing inside directory: [${targetDirectory}]`);
      }

      const sqlScriptPath = path.join(targetDirectory, initMigrationFile);
      const ddlStatementsScript = fs.readFileSync(sqlScriptPath, 'utf8');

      // Execute statements directly inside WebAssembly near the metal
      db.run(ddlStatementsScript);
      console.log(`[SqliteEngine] Static database structural schemas successfully initialized via: [${initMigrationFile}].`);
    } catch (ddlError: any) {
      console.error('[SqliteEngine] Structural breakdown initializing database schema text:', ddlError?.message || ddlError);
      throw ddlError;
    }
  }
}
