// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './routes';
import { runConfigAndStorageInitialization } from './core/config/config.initializer';
import { AppConfigService } from './core/config/config.service';
import { APP_CONFIG } from './core/config/config.model';

// Explicit SQLite Shared Contracts & Strategy Drivers
import { SQLITE_ENGINE_TOKEN } from './core/sqlite/sqlite.engine';
import { NativeSqliteEngine } from './core/sqlite/native.sqlite.engine';
import { BrowserWasmSqliteEngine } from './core/sqlite/browser-wasm.sqlite.engine';

// DataWire Structural Contracts & Strategy Drivers
import { DATA_WIRE_TOKEN } from './core/services/data-wire/data-wire.contract';
import { ElectronDataWire } from './core/services/data-wire/electron.data-wire';
import { CloudDataWire } from './core/services/data-wire/cloud.data-wire';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideRouter(routes),

    // 1. Expose the consolidated raw settings configuration block safely
    {
      provide: APP_CONFIG,
      useFactory: () => inject(AppConfigService).config
    },

    // 2. Multi-Platform SQLite Engine Assignment Routing
    {
      provide: SQLITE_ENGINE_TOKEN,
      useFactory: () => {
        const config = inject(APP_CONFIG);
        return config.isElectron ? inject(NativeSqliteEngine) : inject(BrowserWasmSqliteEngine);
      }
    },

    // 3. Multi-Platform Data Wire Mapping
    {
      provide: DATA_WIRE_TOKEN,
      useFactory: () => {
        const config = inject(APP_CONFIG);
        return config.isElectron ? inject(ElectronDataWire) : inject(CloudDataWire);
      }
    },

    // 4. Linearly resolve initialization parameters asynchronously at boot
    provideAppInitializer(async () => {
      // Load raw json configs and isolate global user agent checks safely first
      await inject(AppConfigService).load();

      // Bootstrap storage schema pools, databases, and background outbox sync engines
      await runConfigAndStorageInitialization();
    })
  ]
};
