export interface DesktopBridge {
  readonly isElectron: true;
  sqliteRead(fileName: string): Promise<Uint8Array | null>;
  sqliteWrite(fileName: string, data: Uint8Array): Promise<void>;
  artExists(relativePath: string): Promise<boolean>;
  artDownload(url: string, destinationPath: string): Promise<void>;
  artRemoveDir(relativePath: string): Promise<void>;
  drizzleBootstrapSql(): Promise<string>;
}

export function getDesktopBridge(): DesktopBridge | undefined {
  return typeof window === 'undefined' ? undefined : window.desktop;
}

export function isElectronRenderer(): boolean {
  return getDesktopBridge()?.isElectron === true;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}
