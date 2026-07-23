// src/app/core/config/config.initializer.ts
import { inject, Injector } from '@angular/core';
import { AppConfigService } from './config.service';
import { SqliteEngine } from '../storage/sqlite/sqlite.engine';
import { OutboxService } from '../services/outbox.service';

/**
 * CONFIGURATION INITIALIZER: Coordinates cross-platform system startup sequences.
 * Executes on-demand initialization scripts securely after storage files are active.
 */
export async function runConfigAndStorageInitialization(): Promise<void> {
  console.log('⚡ ConfigInitializer: Booting system context engine...');

  const configService = inject(AppConfigService);
  const injector = inject(Injector);

  try {
    // PHASE 1: Fetch and unpack your config.json asset file parameters
    await configService.load();
    console.log(`⚡ ConfigInitializer: Settings loaded. Base server URL identified as: ${configService.baseUrl}`);

    // PHASE 2: STORAGE CONFIGURATION INTERCEPT
    // Safe lookup: Request the SqliteEngine singleton token using an optional fallback configuration
    const sqliteEngine = injector.get(SqliteEngine, null);

    // 🌟 TYPE-SAFE ENVIRONMENT PROFILE ZONING:
    // If our useFactory in app.config.ts mapped SqliteEngine into the token ecosystem, execute it.
    // If running on a web/mobile node, the token resolves to null, safely skipping disk allocations!
    if (sqliteEngine) {
      console.log('🖥️ ConfigInitializer: Storage engine detected in active profile. Bootstrapping desktop storage schemas...');

      // 🌟 CRITICAL FIX: Properly await the asynchronous WebAssembly compilation and physical disk check passes
      await sqliteEngine.bootstrapEngine(injector);

      console.log('🖥️ ConfigInitializer: Desktop storage engine bootstrap complete.');
    } else {
      console.log('🌐 ConfigInitializer: Web/Mobile profile verified. Skipping local file block allocations.');
    }

    // PHASE 3: Now that tables are safe on disk (on desktop), awaken background sync loops!
    console.log('🔄 ConfigInitializer: Awakening background data synchronization engines...');

    // Fetch the service via injector.get to bypass asynchronous inject context exceptions safely
    const outboxService = injector.get(OutboxService);
    outboxService.initializeEngine();

    console.log('🏁 ConfigInitializer: System configurations, databases, and background tasks are fully active.');
  } catch (error) {
    console.error('❌ ConfigInitializer: CRITICAL FATAL SEQUENCE CRASH DURING STARTUP INTERCEPT:', error);
    throw error;
  }
}
