// src/app/core/services/file-system.service.ts
import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class FileSystemService {

  /**
   * PLUG-AND-PLAY VIEW TRANSLATOR
   * Evaluates a target string and converts its raw path pointer into a safe link format for <img> tags.
   */
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

  /**
   * DOMAIN-BLIND BINARY DOWNLOAD STREAMER
   * Fetches an external URL endpoint asset, encodes it, and commits it cleanly to a target file path destination.
   */
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

  /**
   * Cleanly wipes an entire directory branch (called during uninstalls)
   */
  public deleteDirectory(path: string): Observable<void> {
    return from(
      Filesystem.rmdir({
        path,
        directory: Directory.Data,
        recursive: true  // Wipes all nested card artwork assets and covers concurrently
      })
    ).pipe(
      map(() => void 0),
      catchError(() => of(void 0)) // Absorb failures quietly if the directory is already gone
    );
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]); // Strip data url headers cleanly
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
