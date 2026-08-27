import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class FileSystemService {

  /** Converts a Data-directory (or Electron cwd) path into an img-safe URI. */
  public resolvePlatformWebViewUri(targetPath: string): Observable<string> {
    if (/^https?:\/\//i.test(targetPath)) {
      return of(targetPath);
    }

    if (this.isElectron()) {
      return this.resolveElectronUri(targetPath);
    }

    return from(
      Filesystem.getUri({
        path: targetPath,
        directory: Directory.Data
      })
    ).pipe(
      map((result) => Capacitor.convertFileSrc(result.uri)),
      catchError(() => throwError(() => new Error(`File target unreachable: ${targetPath}`)))
    );
  }

  /** Downloads a remote URL to durable storage when the host provides it; otherwise returns the remote URL for display. */
  public downloadRemoteUrlToDisk(url: string, destinationPath: string): Observable<string> {
    if (this.isElectron()) {
      return this.downloadElectron(url, destinationPath);
    }

    if (Capacitor.isNativePlatform()) {
      return this.downloadCapacitor(url, destinationPath);
    }

    // Browser: IndexedDB/cache eviction is outside our control; still show art via Scryfall.
    return of(url);
  }

  /** Used on set uninstall; missing directories are ignored. */
  public deleteDirectory(path: string): Observable<void> {
    if (this.isElectron()) {
      try {
        const { fs, path: nodePath, cwd } = this.nodeIo();
        const target = nodePath.join(cwd, path);
        if (fs.existsSync(target)) {
          fs.rmSync(target, { recursive: true, force: true });
        }
      } catch (err) {
        console.error('[FileSystemService] Electron rmdir failed:', err);
      }
      return of(void 0);
    }

    return from(
      Filesystem.rmdir({
        path,
        directory: Directory.Data,
        recursive: true
      })
    ).pipe(
      map(() => void 0),
      catchError(() => of(void 0))
    );
  }

  private downloadCapacitor(url: string, destinationPath: string): Observable<string> {
    return from(fetch(url)).pipe(
      switchMap((response) => {
        if (!response.ok) throw new Error(`CDN network link HTTP asset error: ${response.statusText}`);
        return from(response.blob());
      }),
      switchMap((blob: Blob) => from(this.blobToBase64(blob))),
      switchMap((base64Data: string) => {
        return from(Filesystem.writeFile({
          path: destinationPath,
          data: base64Data,
          directory: Directory.Data,
          recursive: true
        }));
      }),
      switchMap(() => this.resolvePlatformWebViewUri(destinationPath)),
      catchError((err) => {
        console.error(`Platform File Write Transaction crashed:`, err.message);
        return throwError(() => err);
      })
    );
  }

  private downloadElectron(url: string, destinationPath: string): Observable<string> {
    return from(fetch(url)).pipe(
      switchMap(async (response) => {
        if (!response.ok) {
          throw new Error(`CDN network link HTTP asset error: ${response.statusText}`);
        }
        const buffer = new Uint8Array(await response.arrayBuffer());
        const { fs, path: nodePath, cwd, pathToFileURL } = this.nodeIo();
        const abs = nodePath.join(cwd, destinationPath);
        fs.mkdirSync(nodePath.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, buffer);
        return pathToFileURL(abs).href;
      }),
      catchError((err) => {
        console.error('[FileSystemService] Electron write failed:', err?.message || err);
        return throwError(() => err);
      })
    );
  }

  private resolveElectronUri(targetPath: string): Observable<string> {
    try {
      const { fs, path: nodePath, cwd, pathToFileURL } = this.nodeIo();
      const abs = nodePath.join(cwd, targetPath);
      if (!fs.existsSync(abs)) {
        return throwError(() => new Error(`File target unreachable: ${targetPath}`));
      }
      return of(pathToFileURL(abs).href);
    } catch (err) {
      return throwError(() => err);
    }
  }

  private isElectron(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      (window as any).process?.versions?.electron
    );
  }

  private nodeIo(): {
    fs: any;
    path: any;
    cwd: string;
    pathToFileURL: (p: string) => URL;
  } {
    const w = window as any;
    const nodeRequire = w.require;
    if (!nodeRequire || !w.process) {
      throw new Error('[FileSystemService] Electron Node bindings unavailable.');
    }
    const { pathToFileURL } = nodeRequire('url');
    return {
      fs: nodeRequire('fs'),
      path: nodeRequire('path'),
      cwd: w.process.cwd(),
      pathToFileURL
    };
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
