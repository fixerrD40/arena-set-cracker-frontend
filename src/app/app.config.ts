// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject, Injector, runInInjectionContext } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './routes';
import { runConfigAndStorageInitialization } from './core/config/config.initializer';
import { AppConfigService } from './core/config/config.service';
import { APP_CONFIG } from './core/config/config.tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    provideHttpClient(),
    provideRouter(routes),

    // FIXED: Capture the global Injector context and execute your runner inside of it!
    provideAppInitializer(() => {
      const injector = inject(Injector);
      return runInInjectionContext(injector, () => runConfigAndStorageInitialization());
    }),

    {
      provide: APP_CONFIG,
      useFactory: () => {
        const configService = inject(AppConfigService);
        return {
          baseUrl: configService.baseUrl,
          isProduction: configService.isProduction,
          sqliteDbName: configService.sqliteDbName,
          scryfall: configService.scryfall
        };
      }
    }
  ]
};
