// src/app/core/config/app-config.token.ts
import { InjectionToken } from '@angular/core';

/**
 * Isolated configuration parameters for external Scryfall network traffic boundaries
 */
export interface ScryfallConfig {
  apiUrl: string;
  rateLimitDelayMs: number;
  userAgent: string;
}

/**
 * The definitive layout for your global assets/config.json structure
 */
export interface AppConfigData {
  production: boolean;
  baseUrl: string;       // Your outbox-facing backend endpoint
  sqliteDbName: string;  // The magic string filename path required by Drizzle
  scryfall: ScryfallConfig;
}

// A strongly typed token that your services and database infrastructure can safely inject
export const APP_CONFIG = new InjectionToken<AppConfigData>('APP_CONFIG');
