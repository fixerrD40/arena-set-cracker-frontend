// src/app/core/config/config.initializer.ts
import { inject, Injector } from '@angular/core';
import { AppConfigService } from './config.service';
import { OutboxService } from '../services/outbox.service';
import { SqliteEngine } from '../sqlite/sqlite.engine';

/**
 * CONFIGURATION INITIALIZER: Coordinates cross-platform system startup sequences.
 * Executes on-demand initialization scripts cleanly based on your platform profile.
 */
export async function runConfigAndStorageInitialization(): Promise<void> {
  console.log('⚡ ConfigInitializer: Booting system context engine...');

  const configService = inject(AppConfigService);
  const injector = inject(Injector);

  try {
    // PHASE 1: Fetch and unpack your config.json asset file parameters
    const runtimeConfig = await configService.load();
    console.log(`⚡ ConfigInitializer: Settings loaded. Server Endpoint: ${runtimeConfig.baseUrl}`);

    // PHASE 2: STORAGE CONFIGURATION INTERCEPT
    if (runtimeConfig.isElectron) {
      console.log('🖥️ ConfigInitializer: Storage engine detected in active profile. Bootstrapping desktop storage schemas...');

      const sqliteEngine = injector.get(SqliteEngine);
      await sqliteEngine.bootstrap(injector);

      console.log('🖥️ ConfigInitializer: Desktop storage engine bootstrap complete.');
    } else {
      console.log('🌐 ConfigInitializer: Web/Mobile profile verified. Skipping local file block allocations.');
    }

    // PHASE 3: Awaken background synchronization engines
    console.log('🔄 ConfigInitializer: Awakening background data synchronization engines...');

    const outboxService = injector.get(OutboxService);
    outboxService.initializeEngine();

    console.log('🏁 ConfigInitializer: System configurations, databases, and background tasks are fully active.');
  } catch (error) {
    console.error('❌ ConfigInitializer: CRITICAL FATAL SEQUENCE CRASH DURING STARTUP INTERCEPT:', error);
    throw error;
  }
}
