// src/app/core/platform/platform.contract.ts
import { InjectionToken } from '@angular/core';

export interface PlatformContext {
  isElectron: boolean;
  dataWire: any;
}

export const PLATFORM_CONTEXT_TOKEN = new InjectionToken<PlatformContext>('PLATFORM_CONTEXT_TOKEN');
