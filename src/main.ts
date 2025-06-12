import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app/app';
import { routes } from './app/routes';
import { NgZone } from '@angular/core';

fetch('/assets/config.json')
  .then(response => response.json())
  .then(config => {
    bootstrapApplication(App, {
      providers: [
        provideHttpClient(),
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