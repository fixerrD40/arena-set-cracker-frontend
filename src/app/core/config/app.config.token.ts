// src/app/core/config/app.config.token.ts
import { InjectionToken } from '@angular/core';

export interface AppConfigData {
  production: boolean;
  baseUrl: string; // Outbox-facing cloud backend endpoint
}

export const APP_CONFIG = new InjectionToken<AppConfigData>('APP_CONFIG');
