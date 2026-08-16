// src/app/core/services/api/backend.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../config/config.service';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);

  private get baseUrl(): string {
    return this.config.config.baseUrl || 'https://yourdomain.com';
  }

  /**
   * PWA / Web Client Initialization: Fetches a historic snapshot from a remote collection
   * to hydrate the browser's fresh in-memory SQLite sandbox upon initial login.
   */
  public fetchCollectionFromServer<T>(segment: string, contextId: string | number): Observable<T[]> {
    return this.http.get<T[]>(`${this.baseUrl}/api/${segment}?contextId=${contextId}`);
  }

  /**
   * HIGH-PERFORMANCE GLOBAL CHUNK INGESTOR (NDJSON)
   * Streams mixed table transaction ledgers over a single HTTP request connection.
   */
  public streamJsonRecordsToServer(recordObservable$: Observable<any>): Observable<void> {
    return new Observable<void>((subscriber) => {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start(controller) {
          recordObservable$.subscribe({
            next: (row) => {
              const jsonLine = JSON.stringify(row) + '\n';
              controller.enqueue(encoder.encode(jsonLine));
            },
            complete: () => controller.close(),
            error: (err) => {
              controller.error(err);
              subscriber.error(err);
            }
          });
        }
      });

      // Simple, absolute stream entry point to feed your backend outbox processor
      fetch(`${this.baseUrl}/api/outbox/bulk-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: stream,
        duplex: 'half'
      } as any)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`[BackendService] Bulk outbox ingest failed with status: ${response.status}`);
        }
        subscriber.next();
        subscriber.complete();
      })
      .catch(err => subscriber.error(err));
    });
  }
}
