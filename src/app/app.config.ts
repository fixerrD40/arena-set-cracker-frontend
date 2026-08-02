// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject, Injector, runInInjectionContext } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './routes';
import { runConfigAndStorageInitialization } from './core/config/config.initializer';
import { AppConfigService } from './core/config/config.service';
import { APP_CONFIG, AppConfigData } from './core/config/app.config.token';

// DataWire Contract
import { DATA_WIRE_TOKEN } from './core/services/data-wire/data-wire.contract';

/**
 * High-reliability environment flag boundary checker evaluating native browser user agent parameters.
 */
export const isElectronEnvironment = (): boolean => !!(
  typeof window !== 'undefined' &&
  window.navigator &&
  window.navigator.userAgent.toLowerCase().includes('electron')
);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideRouter(routes),

    // 🌟 IDIOMATIC CROSS-PLATFORM FACTORY INJECTION
    // Dynamically resolves platform classes out of the Injector pool at launch.
    // This allows tree-shaking tools to drop Electron files cleanly outside the desktop shell!
    {
      provide: DATA_WIRE_TOKEN,
      useFactory: (injector: Injector) => {
        if (isElectronEnvironment()) {
          // Dynamically fetch the Electron provider only when inside the native desktop window wrapper
          const { ElectronDataWire } = require('./core/services/data-wire/electron.data-wire');
          return injector.get(ElectronDataWire);
        } else {
          // Fallback to CloudDataWire instantly for Web, PWA, or Capacitor Mobile environments
          const { CloudDataWire } = require('./core/services/data-wire/cloud.data-wire');
          return injector.get(CloudDataWire);
        }
      },
      deps: [Injector]
    },

    provideAppInitializer(() => {
      const injector = inject(Injector);
      return runInInjectionContext(injector, () => runConfigAndStorageInitialization());
    }),

    {
      provide: APP_CONFIG,
      useFactory: (): AppConfigData => {
        const configService = inject(AppConfigService);
        return {
          production: !!configService.isProduction,
          baseUrl: configService.baseUrl || ''
        };
      }
    }
  ]
};
