import { Injectable, Injector } from '@angular/core';
import { PlatformContext } from './platform.contract';

@Injectable({ providedIn: 'root' })
export class PlatformOrchestrationService {
  private context!: PlatformContext;

  public isElectronEnvironment(): boolean {
    return !!(typeof window !== 'undefined' && (window as any).process?.versions?.electron);
  }

  public async initializePlatformContext(injector: Injector): Promise<void> {
    const isElectron = this.isElectronEnvironment();

    if (isElectron) {
      // Modern Web-Standard async import splits Electron out of web bundles
      const { ElectronDataWire } = await import('../services/data-wire/electron.data-wire');
      this.context = {
        isElectron: true,
        dataWire: injector.get(ElectronDataWire)
      };
    } else {
      const { CloudDataWire } = await import('../services/data-wire/cloud.data-wire');
      this.context = {
        isElectron: false,
        dataWire: injector.get(CloudDataWire)
      };
    }
  }

  public getContext(): PlatformContext {
    if (!this.context) {
      throw new Error('PlatformOrchestrationService read before initialization context was established.');
    }
    return this.context;
  }
}
