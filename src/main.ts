import { bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app/app';
import { routes } from './app/routes';
import { NgZone } from '@angular/core';
import { TokenInterceptor } from './app/interceptors/token-interceptor';

fetch('/assets/config.json')
  .then(response => response.json())
  .then(config => {
    bootstrapApplication(App, {
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        {
          provide: HTTP_INTERCEPTORS,
          useClass: TokenInterceptor,
          multi: true
        },
        provideRouter(routes),
        {
          provide: 'APP_CONFIG',
          useValue: config
        },
        {
          provide: NgZone,
          useFactory: () => new NgZone({
            shouldCoalesceEventChangeDetection: true,
            shouldCoalesceRunChangeDetection: true
          }),
          deps: []
        }
      ]
    });
  })
  .catch(err => {
    console.error('Application bootstrap failed:', err);
  });