// src/app/app.config.ts
import {
  ApplicationConfig,
  provideZoneChangeDetection,
  provideAppInitializer,
  inject,
  Injector,
  runInInjectionContext,
  InjectionToken
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './routes';
import { runConfigAndStorageInitialization } from './core/config/config.initializer';
import { AppConfigService } from './core/config/config.service';
import { APP_CONFIG, AppConfigData } from './core/config/app.config.token';

// DataWire Contract and Platform Wire Conductor Implementations
import { DataWire } from './core/services/data-wire/data-wire.contract';
import { ElectronDataWire } from './core/services/data-wire/electron.data-wire';
import { CloudDataWire } from './core/services/data-wire/cloud.data-wire';

/**
 * Centrally managed dependency injection token for your stateless data pipes.
 * Resolves polymorphically to Electron or Cloud storage targets based on environment constraints.
 */
export const DATA_WIRE_TOKEN = new InjectionToken<DataWire>('DATA_WIRE_TOKEN');

/**
 * High-reliability environment flag boundary checker evaluating native browser user agent parameters.
 */
const isElectronEnvironment = (): boolean => !!(
  typeof window !== 'undefined' &&
  window.navigator &&
  window.navigator.userAgent.toLowerCase().includes('electron')
);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideRouter(routes),

    // 🌟 IDIOMATIC POLYMORPHIC BINDING
    // Automatically routes your global token dependency to the correct data platform implementation
    {
      provide: DATA_WIRE_TOKEN,
      // 🌟 Cleanest Mapping: Directly assign your two main wire options
      useClass: isElectronEnvironment() ? ElectronDataWire : CloudDataWire
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
