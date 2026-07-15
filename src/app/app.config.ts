import { ApplicationConfig, NgZone, APP_INITIALIZER } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './routes';
import { TokenInterceptor } from './interceptors/token-interceptor';

export function initConfigFactory() {
  return () => fetch('assets/config.json')
    .then(res => res.json())
    .then(config => {
      (window as any).APP_CONFIG_DATA = config;
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    // Core HTTP setup
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    },

    // Routes
    provideRouter(routes),

    // Dynamic Config file injection
    {
      provide: APP_INITIALIZER,
      useFactory: initConfigFactory,
      multi: true
    },
    {
      provide: 'APP_CONFIG',
      useFactory: () => (window as any).APP_CONFIG_DATA
    },

    {
      provide: NgZone,
      useFactory: () => new NgZone({
        shouldCoalesceEventChangeDetection: true,
        shouldCoalesceRunChangeDetection: true
      })
    }
  ]
};
