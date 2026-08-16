// src/app/core/config/config.model.ts
import { InjectionToken } from '@angular/core';

export interface ScryfallConfigData {
  apiUrl: string;
  rateLimitDelayMs: number;
  userAgent: string;
}

export interface AppConfigData {
  production: boolean;
  baseUrl: string;       // Outbox-facing cloud backend endpoint
  sqliteDbName: string;  // Local desktop database file name
  scryfall: ScryfallConfigData;
  isElectron: boolean;   // 🌟 Central environment indicator evaluated at boot
}

// The single, definitive token for your entire configuration ecosystem
export const APP_CONFIG = new InjectionToken<AppConfigData>('APP_CONFIG');
