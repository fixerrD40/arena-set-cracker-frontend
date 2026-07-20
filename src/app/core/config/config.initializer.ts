// src/app/core/config/config.initializer.ts
import { inject, Injector, runInInjectionContext } from '@angular/core';
import { AppConfigService } from './config.service';
import { SqliteService } from '../sqlite/sqlite.service';
import { OutboxService } from '../services/outbox.service'; // Import your outbox engine

/**
 * CONFIGURATION INITIALIZER: Coordinates system startup sequences.
 * Executes on-demand initialization scripts securely after storage files are active.
 */
export async function runConfigAndStorageInitialization(): Promise<void> {
  console.log('⚡ ConfigInitializer: Booting system context engine...');

  const configService = inject(AppConfigService);
  const injector = inject(Injector);

  try {
    // PHASE 1: Fetch and unpack your config.json asset file parameters
    await configService.load();
    console.log(`⚡ ConfigInitializer: Settings loaded. Database target identified as: ${configService.sqliteDbName}`);

    // PHASE 2: Instruct SqliteService to initialize its static cache parameters directly
    // This catches missing files and compiles all schemas all at once from sqlite.schema.ts
    await SqliteService.bootstrapEngine(injector);

    // PHASE 3: Now that tables are safe on disk, dynamically wake up the background flusher!
    runInInjectionContext(injector, () => {
      const outboxService = inject(OutboxService);

      // Call your safe public method inside an isolated execution environment channel!
      outboxService.initializeEngine();
    });

    console.log('🏁 ConfigInitializer: System database files, configurations, and outbox flusher are fully synced.');
  } catch (error) {
    console.error('❌ ConfigInitializer: CRITICAL FATAL SEQUENCE CRASH DURING STARTUP INTERCEPT:', error);
    throw error;
  }
}
