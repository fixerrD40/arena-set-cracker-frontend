// src/app/core/config/config.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ScryfallConfig } from './scryfall.config.token';

/**
 * PRIVATE LOCAL DESERIALIZATION SHAPE
 * Maps the literal un-decomposed layout of your assets/config.json file.
 */
interface RawConfigJson {
  production: boolean;
  baseUrl: string;
  sqliteDbName: string;
  scryfall: ScryfallConfig;
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private readonly http = inject(HttpClient);

  // Strongly type against the raw JSON model contract
  private configData!: RawConfigJson;

  /**
   * Refactored: Uses true, native async/await syntax to fetch
   * the local asset configuration file before application startup.
   */
  public async load(): Promise<void> {
    try {
      // Modern Angular natively converts fetch pipelines seamlessly via its internal runtime mechanics
      const response = await fetch('assets/config.json');
      this.configData = await response.json();
    } catch (error) {
      console.error('Critical Error: Failed to load local configuration file async:', error);
      // Fallback object initialization to prevent application rendering breaks if file is missing
      this.configData = {
        production: false,
        baseUrl: '',
        sqliteDbName: 'app_database.sqlite',
        scryfall: {
          apiUrl: 'https://scryfall.com',
          rateLimitDelayMs: 100,
          userAgent: 'MTG-Arena-Set-Sharer/1.0'
        }
      };
    }
  }

  // ==========================================================
  // TYPE-SAFE PUBLIC GETTER CHANNELS (Consumed by app.config.ts)
  // ==========================================================

  public get isProduction(): boolean {
    return this.configData?.production ?? false;
  }

  public get baseUrl(): string {
    return this.configData?.baseUrl ?? '';
  }

  public get sqliteDbName(): string {
    return this.configData?.sqliteDbName ?? 'app_database.sqlite';
  }

  public get scryfall(): ScryfallConfig {
    return this.configData?.scryfall;
  }
}
