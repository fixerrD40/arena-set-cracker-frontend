import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class FileSystemService {

  /** Converts a Data-directory path into a WebView-safe URI for img tags. */
  public resolvePlatformWebViewUri(targetPath: string): Observable<string> {
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

  /** Downloads a remote URL into Directory.Data at destinationPath; returns WebView URI. */
  public downloadRemoteUrlToDisk(url: string, destinationPath: string): Observable<string> {
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

  /** Used on set uninstall; missing directories are ignored. */
  public deleteDirectory(path: string): Observable<void> {
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

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      // Capacitor writeFile expects raw base64 without the data: URL prefix
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
