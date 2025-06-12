import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { provideHttpClient } from '@angular/common/http';

fetch('/assets/config.json')
  .then(response => response.json())
  .then(config => {
    const providers = [
      provideHttpClient(),
      {
        provide: 'APP_CONFIG',
        useValue: config
      }
    ];

    bootstrapApplication(App, { providers });
  })
  .catch(err => {
    console.error('Failed to load config.json:', err);
  });