// src/app/core/config/config.initializer.ts
import { inject, Injector } from '@angular/core';
import { AppConfigService } from './config.service';
import { OutboxService } from '../services/outbox.service';
import { SQLITE_ENGINE_TOKEN } from '../sqlite/sqlite.engine';

/**
 * Coordinates cross-platform startup: config load, SQLite bootstrap, outbox wake-up.
 */
export async function runConfigAndStorageInitialization(): Promise<void> {
  console.log('⚡ ConfigInitializer: Booting system context engine...');

  const configService = inject(AppConfigService);
  const injector = inject(Injector);

  try {
    const runtimeConfig = await configService.load();
    console.log(`⚡ ConfigInitializer: Settings loaded. Server Endpoint: ${runtimeConfig.baseUrl}`);

    const sqliteEngine = injector.get(SQLITE_ENGINE_TOKEN);
    console.log(
      runtimeConfig.isElectron
        ? '🖥️ ConfigInitializer: Bootstrapping desktop storage...'
        : '🌐 ConfigInitializer: Bootstrapping browser WASM storage...'
    );
    await sqliteEngine.bootstrap(injector);

    const outboxService = injector.get(OutboxService);
    outboxService.initializeEngine();

    console.log('🏁 ConfigInitializer: System configurations, databases, and background tasks are fully active.');
  } catch (error) {
    console.error('❌ ConfigInitializer: CRITICAL FATAL SEQUENCE CRASH DURING STARTUP INTERCEPT:', error);
    throw error;
  }
}
