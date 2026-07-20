// src/app/core/config/app-config.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppConfigData, ScryfallConfig } from './config.tokens';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private configData!: AppConfigData;

  /**
   * Refactored: Uses true, native async/await syntax to fetch
   * the local asset configuration file before application startup.
   */
  async load(): Promise<void> {
    try {
      // Modern Angular natively converts fetch pipelines seamlessly via its internal runtime mechanics
      const response = await fetch('assets/config.json');
      this.configData = await response.json();
    } catch (error) {
      console.error('Critical Error: Failed to load local configuration file async:', error);
      // Optional: Insert safe fallback dictionary data parameters here if needed
    }
  }

  // Pure type-safe properties
  get isProduction(): boolean { return this.configData?.production ?? false; }
  get baseUrl(): string { return this.configData?.baseUrl ?? ''; }
  get sqliteDbName(): string { return this.configData?.sqliteDbName ?? ''; }
  get scryfall(): ScryfallConfig { return this.configData?.scryfall; }
}
