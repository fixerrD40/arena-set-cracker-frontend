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

    // ENVIRONMENT CHECK: Safely determine if running inside an Electron desktop context
    const isElectron = !!(
      typeof window !== 'undefined' &&
      window.navigator &&
      window.navigator.userAgent.toLowerCase().includes('electron')
    );

    if (isElectron) {
      console.log('🖥️ ConfigInitializer: Electron host detected. Bootstrapping desktop storage engine...');

      // Look up your root-injectable SqliteEngine singleton from the injector instance
      const sqliteEngine = injector.get(SqliteEngine);
      await sqliteEngine.bootstrapEngine(injector);
    } else {
      console.log('🌐 ConfigInitializer: Web/Mobile platform detected. Skipping local file block allocations.');
    }

    // PHASE 3: Now that tables are safe on disk (on desktop), awaken background sync loops!
    console.log('🔄 ConfigInitializer: Awakening background data synchronization engines...');

    // 🌟 FIX: Fetch the service via injector.get to bypass asynchronous inject context exceptions safely
    const outboxService = injector.get(OutboxService);
    outboxService.initializeEngine();

    console.log('🏁 ConfigInitializer: System configurations, databases, and background tasks are fully active.');
  } catch (error) {
    console.error('❌ ConfigInitializer: CRITICAL FATAL SEQUENCE CRASH DURING STARTUP INTERCEPT:', error);
    throw error;
  }
}
