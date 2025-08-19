import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export class CrudService<T> {

  protected apiUrl: string;

  constructor(
    protected http: HttpClient,
    appConfig: any,
    entityName: string
  ) {
    this.apiUrl = `${appConfig.baseUrl}/api/${entityName}`;
  }

  create(entity: T, extraHeaders?: { [key: string]: string }): Observable<T> {
    const options = this.getHttpOptions(extraHeaders);

    return this.http.post<T>(this.apiUrl, entity, options)
      .pipe(catchError(this.handleError));
  }

  getAll(extraHeaders?: { [key: string]: string }): Observable<T[]> {
    return this.http.get<T[]>(this.apiUrl, this.getHttpOptions(extraHeaders))
      .pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  update(id: string | number, entity: T, extraHeaders?: { [key: string]: string }): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${id}`, entity, this.getHttpOptions(extraHeaders))
      .pipe(catchError(this.handleError));
  }

  delete(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  protected getHttpOptions(extraHeaders?: { [header: string]: string }): { headers: HttpHeaders } {
  let headers = new HttpHeaders({
    'Content-Type': 'application/json',
    ...extraHeaders,
  });

  return { headers };
}

  protected handleError(error: HttpErrorResponse) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      errorMessage = `Server-side error: ${error.status} ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}