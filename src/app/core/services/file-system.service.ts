import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class FileSystemService {
  constructor() {}

  /**
   * Universal downloader that handles disk writes safely on Electron, iOS, and Android sandboxes.
   * @returns A local URI string that the HTML <img> tag can natively read on any platform.
   */
  downloadFile(url: string, setCode: string, arenaId: number): Observable<string> {
    const cleanCode = setCode.toLowerCase();
    const targetDirectory = `cached_art/${cleanCode}`;
    const targetFilePath = `${targetDirectory}/${arenaId}.png`;

    // 1. Fetch the remote image binary data using standard web fetch
    return from(fetch(url)).pipe(
      switchMap((response) => {
        if (!response.ok) throw new Error(`Scryfall CDN HTTP error: ${response.statusText}`);
        return from(response.blob());
      }),
      // 2. Convert the raw binary blob to a Base64 string (Required by Capacitor's cross-platform bridge)
      switchMap((blob: Blob) => from(this.blobToBase64(blob))),
      switchMap((base64Data: string) => {
        // 3. Commit file safely to the permanent app data sector (Handles Node fs on Desktop, Sandbox on Mobile)
        return from(Filesystem.writeFile({
          path: targetFilePath,
          data: base64Data,
          directory: Directory.Data,
          recursive: true           // Automatically manufactures missing subfolders
        }));
      }),
      switchMap(() => {
        // 4. Request the direct native URI string that the local WebView layer is authorized to display
        return from(Filesystem.getUri({
          path: targetFilePath,
          directory: Directory.Data
        }));
      }),
      // 5. Convert standard filesystem paths into a safe rendering link format for <img> tags
      map(result => Capacitor.convertFileSrc(result.uri)),
      catchError(err => {
        console.error(`File transaction crashed on active platform:`, err.message);
        return throwError(() => err);
      })
    );
  }

  /**
   * Helper converting binary blobs into standard base64 strings
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to encode asset blob to Base64 format'));
      reader.onload = () => {
        const result = reader.result as string;
        // Strip out the metadata header wrapper text (e.g. "data:image/png;base64,")
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Saves a JavaScript object (like your application configuration profile) directly to disk as a JSON file.
   */
  writeJsonFile(fileName: string, data: any): Observable<void> {
    const base64Data = btoa(JSON.stringify(data)); // Quick encoding to match Capacitor's write requirement

    return from(Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
      recursive: true
    })).pipe(
      map(() => void 0),
      catchError(err => {
        console.error(`Failed to write configuration file ${fileName}:`, err.message);
        return throwError(() => err);
      })
    );
  }

  /**
   * Reads a JSON file from disk and parses it back into a JavaScript object.
   */
  readJsonFile<T>(fileName: string): Observable<T> {
    return from(Filesystem.readFile({
      path: fileName,
      directory: Directory.Data
    })).pipe(
      map(result => {
        // Decode back from Base64 string to a true JavaScript object configuration
        const decodedString = atob(result.data as string);
        return JSON.parse(decodedString) as T;
      }),
      catchError(err => {
        console.error(`Failed to read or parse file ${fileName}:`, err.message);
        return throwError(() => err);
      })
    );
  }
}
