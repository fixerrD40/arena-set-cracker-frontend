import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export class CrudService<T> {

  private apiUrl: string;

  constructor(
    protected http: HttpClient,
    appConfig: any,
    entityName: string
  ) {
    this.apiUrl = `${appConfig.baseUrl}/api/${entityName}`;
  }

  create(entity: T): Observable<T> {
    return this.http.post<T>(this.apiUrl, entity, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  getAll(): Observable<T[]> {
    return this.http.get<T[]>(this.apiUrl, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  update(id: string | number, entity: T): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${id}`, entity, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  delete(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      })
    };
  }

  private handleError(error: HttpErrorResponse) {
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