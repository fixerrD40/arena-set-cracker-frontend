// src/app/core/services/api/backend.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../config/config.service';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);
  private readonly jsonOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  /**
   * Dynamically resolves the base URL from the application's configuration context.
   */
  private get baseUrl(): string {
    return this.config.baseUrl || 'https://yourdomain.com';
  }

  // ==========================================================
  // ATOMIC CRUD NETWORK CONDUCTORS (Used by CloudDataWire)
  // ==========================================================

  /**
   * Requests a collection from a remote REST endpoint.
   */
  public fetchCollection<T>(segment: string, contextId: string | number): Observable<T[]> {
    return this.http.get<T[]>(`${this.baseUrl}/${segment}?contextId=${contextId}`);
  }

  /**
   * Submits a fresh payload to a remote endpoint via HTTP POST.
   */
  public insert<T>(segment: string, payload: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${segment}`, payload, this.jsonOptions);
  }

  /**
   * Pushes partial modifications to a remote endpoint via HTTP PATCH.
   */
  public update<T>(segment: string, id: string | number, payload: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${segment}/${id}`, payload, this.jsonOptions);
  }

  /**
   * Destroys a remote record by unique identifier via HTTP DELETE.
   */
  public delete(segment: string, id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${segment}/${id}`);
  }

  // ==========================================================
  // HIGH-PERFORMANCE CHUNK STREAMER (Used by OutboxService)
  // ==========================================================

  /**
   * HIGH-PERFORMANCE CHUNK WRITER (NDJSON)
   * Streams raw JSON lines over a single fetch connection using a custom browser readable stream.
   */
  public streamJsonRecordsToServer(recordObservable$: Observable<any>, endpointPath: string): Observable<void> {
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

      fetch(`${this.baseUrl}/${endpointPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: stream,
        duplex: 'half'
      } as any)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`[BackendService] Bulk stream failed with status: ${response.status}`);
        }
        subscriber.next();
        subscriber.complete();
      })
      .catch(err => subscriber.error(err));
    });
  }
}
