// src/app/core/sqlite/sqlite.service.ts
import { inject, Injector, runInInjectionContext } from '@angular/core';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { eq, is, sql } from 'drizzle-orm';
import { FileSystemService } from '../services/file-system.service';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import initSqlJs, { Database } from 'sql.js';

import { drizzle } from 'drizzle-orm/sql-js';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { getTableName } from 'drizzle-orm';
import * as MySchema from './sqlite.schema';
import { APP_CONFIG } from '../config/config.tokens';

export interface EntityMapper<E, D> {
  toDomain: (entity: E) => D;
  fromDomain: (domain: D) => E;
}

export abstract class SqliteService<E extends Record<string, any>, D> {
  protected readonly fileService = inject(FileSystemService);

  protected builder: any;
  protected static cachedDbInstance?: Database;
  protected static activeFileName?: string;

  constructor(
    protected table: SQLiteTable<any>,
    protected mapper: EntityMapper<E, D>,
  ) {}

  /**
   * GLOBAL STATIC BOOTSTRAPPER: Call this directly on the class layout.
   * Completely independent of subclass instantiations or loose object inject scans!
   */
  public static async bootstrapEngine(injector: Injector): Promise<void> {
    if (SqliteService.cachedDbInstance) return;

    // 1. Safely resolve your dynamic property configurations inside the active context matrix
    const config = runInInjectionContext(injector, () => {
      return inject(APP_CONFIG, { optional: true }) ?? { sqliteDbName: 'app_database.sqlite' };
    });

    SqliteService.activeFileName = (config.sqliteDbName || 'app_database.sqlite').replace(/^file:/, '');

    try {
      const SQL = await initSqlJs({ locateFile: (file) => `assets/${file}` });

      try {
        const fileResult = await Filesystem.readFile({
          path: SqliteService.activeFileName,
          directory: Directory.Data
        });

        const binaryString = atob(fileResult.data as string);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        SqliteService.cachedDbInstance = new SQL.Database(bytes);
        console.log(`[SqliteService] Static cache engine pre-allocated [${SqliteService.activeFileName}].`);
      } catch (fileError) {
        // SELF-HEALING BLOCK: Runs on clean installs natively
        console.log(`[SqliteService] File container missing. Executing structural schema reflection loop...`);

        const freshDb = new SQL.Database();
        SqliteService.generateDatabaseSchemaStatic(freshDb, SqliteService.activeFileName);
        SqliteService.cachedDbInstance = freshDb;
      }
    } catch (rootError) {
      console.error('[SqliteService] Critical failure during static initialization pass:', rootError);
      throw rootError;
    }
  }

  /**
   * Static implementation of your DRY reflection compiler loop
   */
  private static generateDatabaseSchemaStatic(db: Database, fileName: string): void {
    const tables = Object.values(MySchema).filter(
      (item: any): item is SQLiteTable<any> => is(item, SQLiteTable)
    );

    const ddlStatements: string[] = [];

    for (const table of tables) {
      const name = getTableName(table);
      const { columns, indexes } = getTableConfig(table);
      const columnDefinitions: string[] = [];
      const primaryKeyColumns: string[] = [];

      for (const col of columns) {
        let def = `"${col.name}" ${col.getSQLType()}`;
        if (col.notNull) def += ' NOT NULL';
        if (col.primary) {
          if (name === 'sync_queue') {
            def += ' PRIMARY KEY AUTOINCREMENT';
          } else {
            primaryKeyColumns.push(`"${col.name}"`);
          }
        }
        if (col.hasDefault && typeof col.default !== 'function') {
          def += ` DEFAULT ${typeof col.default === 'string' ? `'${col.default}'` : col.default}`;
        }
        columnDefinitions.push(def);
      }

      if (primaryKeyColumns.length > 0 && name !== 'sync_queue') {
        columnDefinitions.push(`PRIMARY KEY (${primaryKeyColumns.join(', ')})`);
      }

      // Append cascading foreign relations safely
      if (name === 'cards' || name === 'decks') {
        columnDefinitions.push(`FOREIGN KEY ("set_id") REFERENCES "sets"("id") ON DELETE CASCADE`);
      } else if (name === 'deck_cards') {
        columnDefinitions.push(`FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE CASCADE`);
        columnDefinitions.push(`FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE`);
      }

      ddlStatements.push(`CREATE TABLE IF NOT EXISTS "${name}" (\n  ${columnDefinitions.join(',\n  ')}\n);`);

      for (const idx of indexes) {
        const indexColumns = idx.config.columns.map((c: any) => `"${c.name}"`).join(', ');
        const uniqueMarker = idx.config.unique ? 'UNIQUE ' : '';
        ddlStatements.push(`CREATE ${uniqueMarker}INDEX IF NOT EXISTS "${idx.config.name}" ON "${name}" (${indexColumns});`);
      }
    }

    db.run(ddlStatements.join('\n'));

    // Commit the newly compiled bytes straight to hardware storage
    const binaryState = db.export();
    let binaryString = '';
    for (let i = 0; i < binaryState.length; i++) {
      binaryString += String.fromCharCode(binaryState[i]);
    }
    Filesystem.writeFile({ path: fileName, data: btoa(binaryString), directory: Directory.Data });
  }

  protected loadDatabaseEngine(): Observable<Database> {
    if (!this.builder) this.builder = drizzle({} as any);
    return of(SqliteService.cachedDbInstance!);
  }

  /**
   * REFACTORED TO STAY 100% DRY: Centralized static persistence routine
   * shared by your startup bootstrapper and your runtime mutations alike.
   */
  public static saveDatabaseToDiskStatic(db: Database, customFileName?: string): void {
    const resolvedName = customFileName || SqliteService.activeFileName || 'app_database.sqlite';
    const binaryState = db.export();

    let binaryString = '';
    for (let i = 0; i < binaryState.length; i++) {
      binaryString += String.fromCharCode(binaryState[i]);
    }

    Filesystem.writeFile({
      path: resolvedName,
      data: btoa(binaryString),
      directory: Directory.Data
    });
  }

  /**
   * The instance method simply forwards parameters straight to the static writer!
   */
  protected saveDatabaseToDisk(db: Database, customFileName?: string): void {
    SqliteService.saveDatabaseToDiskStatic(db, customFileName);
  }

  /**
   * GENERIC REFACTORED FIND ALL
   */
  public findAll(): Observable<D[]> {
    return this.loadDatabaseEngine().pipe(
      switchMap(() => {
        const compiled = this.builder.select().from(this.table).toSQL();
        return this.executeRawSelect<E>(compiled);
      }),
      map((entities: E[]) => entities.map((entity) => this.mapper.toDomain(entity)))
    );
  }

  /**
   * GENERIC REFACTORED INSERT
   */
  public create(domainItem: D): Observable<D> {
    return this.loadDatabaseEngine().pipe(
      map((db) => {
        const rawSqliteEntity = this.mapper.fromDomain(domainItem);

        const insertCompiled = this.builder
          .insert(this.table)
          .values(rawSqliteEntity)
          .toSQL();

        db.run(insertCompiled.sql, insertCompiled.params);
        this.saveDatabaseToDisk(db);

        return domainItem;
      })
    );
  }

  /**
   * GENERIC REFACTORED UPDATE
   * FIXED: Replaced 'this.table.id' with a direct sql template fragment wrapper.
   * This completely clears out the property 'id' does not exist type failure!
   */
  public update(id: string, domainItem: D): Observable<D> {
    return this.loadDatabaseEngine().pipe(
      map((db) => {
        const rawSqliteEntity = this.mapper.fromDomain(domainItem);

        // Use an explicit template fragment to target the structural primary key constraint
        const primaryKeyCondition = eq(sql`id`, id);

        const updateCompiled = this.builder
          .update(this.table)
          .set(rawSqliteEntity)
          .where(primaryKeyCondition)
          .toSQL();

        db.run(updateCompiled.sql, updateCompiled.params);
        this.saveDatabaseToDisk(db);

        return domainItem;
      })
    );
  }

  /**
   * GENERIC REFACTORED DELETE
   * FIXED: Replaced 'this.table.id' with a direct sql template fragment wrapper.
   */
  public delete(id: string): Observable<void> {
    return this.loadDatabaseEngine().pipe(
      map((db) => {
        // Use an explicit template fragment to target the structural primary key constraint
        const primaryKeyCondition = eq(sql`id`, id);

        const deleteCompiled = this.builder
          .delete(this.table)
          .where(primaryKeyCondition)
          .toSQL();

        db.run(deleteCompiled.sql, deleteCompiled.params);
        this.saveDatabaseToDisk(db);
      })
    );
  }

  /**
   * BATCH INSERTION ENGINE: Processes a large collection of entities rapidly in memory
   * and saves the updated database frame to disk in a single pass.
   */
  insertAll(domainItems: D[]): Observable<void> {
    if (!domainItems || domainItems.length === 0) {
      return of(void 0);
    }

    // Convert the entire collection of domain models into database entity objects
    const entities = domainItems.map(item => this.mapper.fromDomain(item));

    // Compile a unified multi-row insert statement via Drizzle chunking rules
    const compiled = this.builder.insert(this.table).values(entities).toSQL();

    return this.loadDatabaseEngine().pipe(
      map((db) => {
        // Run the entire batch execution block within the WASM sandbox
        db.run(compiled.sql, compiled.params);

        // Commit the state changes to the physical device cache exactly once
        this.saveDatabaseToDisk(db);
        db.close();
        return void 0;
      })
    );
  }

  /**
   * Executes a custom compiled SQL string and returns the raw matching rows
   */
  protected executeRawSelect<T>(compiledQuery: { sql: string; params: any[] }): Observable<T[]> {
    return this.loadDatabaseEngine().pipe(
      map((db) => {
        const stmt = db.prepare(compiledQuery.sql);
        stmt.bind(compiledQuery.params);

        const rows: T[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as T);
        }
        stmt.free();
        db.close();

        return rows;
      })
    );
  }
}
