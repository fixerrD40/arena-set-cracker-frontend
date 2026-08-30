import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { electronArtWebViewUri } from './file-system.electron-uri';
import { getDesktopBridge, isElectronRenderer } from '../platform/desktop-bridge';

@Injectable({
  providedIn: 'root',
})
export class FileSystemService {

  /** Converts a Data-directory (or Electron cwd) path into an img-safe URI. */
  public resolvePlatformWebViewUri(targetPath: string): Observable<string> {
    if (/^https?:\/\//i.test(targetPath)) {
      return of(targetPath);
    }

    if (isElectronRenderer()) {
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
    if (isElectronRenderer()) {
      return this.downloadElectron(url, destinationPath);
    }

    if (Capacitor.isNativePlatform()) {
      return this.downloadCapacitor(url, destinationPath);
    }

    // Browser: IndexedDB/cache eviction is outside our control; still show art via Scryfall.
    return of(url);
  }

  /** Used on set uninstall; missing directories are ignored. */
  public deleteDirectory(relativePath: string): Observable<void> {
    if (isElectronRenderer()) {
      const desktop = getDesktopBridge();
      if (!desktop) {
        return of(void 0);
      }
      return from(desktop.artRemoveDir(relativePath)).pipe(
        catchError((err) => {
          console.error('[FileSystemService] Electron rmdir failed:', err);
          return of(void 0);
        })
      );
    }

    return from(
      Filesystem.rmdir({
        path: relativePath,
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
    const desktop = getDesktopBridge();
    if (!desktop) {
      return throwError(() => new Error('[FileSystemService] Desktop bridge unavailable.'));
    }
    return from(desktop.artDownload(url, destinationPath)).pipe(
      map(() => electronArtWebViewUri(destinationPath)),
      catchError((err) => {
        console.error('[FileSystemService] Electron write failed:', err?.message || err);
        return throwError(() => err);
      })
    );
  }

  private resolveElectronUri(targetPath: string): Observable<string> {
    const desktop = getDesktopBridge();
    if (!desktop) {
      return throwError(() => new Error('[FileSystemService] Desktop bridge unavailable.'));
    }
    return from(desktop.artExists(targetPath)).pipe(
      switchMap((exists) => {
        if (!exists) {
          return throwError(() => new Error(`File target unreachable: ${targetPath}`));
        }
        return of(electronArtWebViewUri(targetPath));
      })
    );
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
