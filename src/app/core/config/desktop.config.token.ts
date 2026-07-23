// src/app/core/config/desktop.config.token.ts
import { InjectionToken } from '@angular/core';

export interface DesktopConfigData {
  sqliteDbName: string; // The binary database container name required by Drizzle
}

export const DESKTOP_CONFIG = new InjectionToken<DesktopConfigData>('DESKTOP_CONFIG');
