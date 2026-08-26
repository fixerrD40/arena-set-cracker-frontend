// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './routes';
import { runConfigAndStorageInitialization } from './core/config/config.initializer';
import { AppConfigService } from './core/config/config.service';
import { APP_CONFIG } from './core/config/config.model';
import { tokenInterceptor } from './core/interceptors/token-interceptor';

import { SQLITE_ENGINE_TOKEN } from './core/sqlite/sqlite.engine';
import { NativeSqliteEngine } from './core/sqlite/native.sqlite.engine';
import { BrowserWasmSqliteEngine } from './core/sqlite/browser-wasm.sqlite.engine';

import { DATA_WIRE_TOKEN } from './core/services/data-wire/data-wire.contract';
import { ElectronDataWire } from './core/services/data-wire/electron.data-wire';
import { CloudDataWire } from './core/services/data-wire/cloud.data-wire';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    provideRouter(routes),

    {
      provide: APP_CONFIG,
      useFactory: () => inject(AppConfigService).config
    },

    {
      provide: SQLITE_ENGINE_TOKEN,
      useFactory: () => {
        const config = inject(APP_CONFIG);
        return config.isElectron ? inject(NativeSqliteEngine) : inject(BrowserWasmSqliteEngine);
      }
    },

    {
      provide: DATA_WIRE_TOKEN,
      useFactory: () => {
        const config = inject(APP_CONFIG);
        return config.isElectron ? inject(ElectronDataWire) : inject(CloudDataWire);
      }
    },

    provideAppInitializer(async () => {
      await inject(AppConfigService).load();
      await runConfigAndStorageInitialization();
    })
  ]
};
