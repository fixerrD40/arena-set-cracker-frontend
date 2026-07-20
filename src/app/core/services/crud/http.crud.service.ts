import { inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Standard configuration object for passing HTTP metadata headers
 */
const HTTP_OPTIONS = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

export abstract class HttpCrudService<T, ID extends string | number = string> {
  // Inject Angular's core HttpClient module programmatically
  protected readonly http = inject(HttpClient);

  /**
   * Abstract token to force extending classes to provide their target endpoint url path
   * Example: 'https://your-api-url.com'
   */
  protected abstract readonly endpointUrl: string;

  /**
   * Fetches the complete collection array from the remote server
   */
  public getAll(): Observable<T[]> {
    return this.http.get<T[]>(this.endpointUrl);
  }

  /**
   * Retrieves a single specific record by its primary unique identity key match
   */
  public getById(id: ID): Observable<T> {
    return this.http.get<T>(`${this.endpointUrl}/${id}`);
  }

  /**
   * Submits a fresh payload to be created on the remote cloud storage layer
   */
  public create(payload: Partial<T>): Observable<T> {
    return this.http.post<T>(this.endpointUrl, payload, HTTP_OPTIONS);
  }

  /**
   * Updates an existing remote record configuration via a partial PATCH modification envelope
   */
  public update(id: ID, payload: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.endpointUrl}/${id}`, payload, HTTP_OPTIONS);
  }

  /**
   * Evicts a resource completely from the remote cloud storage system
   */
  public delete(id: ID): Observable<void> {
    return this.http.delete<void>(`${this.endpointUrl}/${id}`);
  }
}
