// src/app/core/config/scryfall.config.token.ts
import { InjectionToken } from '@angular/core';

export interface ScryfallConfig {
  apiUrl: string;
  rateLimitDelayMs: number;
  userAgent: string;
}

export const SCRYFALL_CONFIG = new InjectionToken<ScryfallConfig>('SCRYFALL_CONFIG');
