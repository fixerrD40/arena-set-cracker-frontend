import { InjectionToken } from '@angular/core';

export interface ScryfallConfigData {
  apiUrl: string;
  rateLimitDelayMs: number;
  userAgent: string;
}

export interface AppConfigData {
  production: boolean;
  baseUrl: string;       // Cloud backend for outbox sync
  sqliteDbName: string;  // Local desktop DB filename
  scryfall: ScryfallConfigData;
  isElectron: boolean;
}

export const APP_CONFIG = new InjectionToken<AppConfigData>('APP_CONFIG');
