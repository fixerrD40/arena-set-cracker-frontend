import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';

import { SetStoreService } from './set-store-service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authUrl: string;
  private jwtKey = 'jwt';
  private usernameKey = 'username';

  private usernameSubject = new BehaviorSubject<string | null>(
    localStorage.getItem(this.usernameKey)
  );
  username$ = this.usernameSubject.asObservable();

  readonly isAuthenticated$ = this.username$.pipe(
    map(username => !!username)
  );

  constructor(
    protected http: HttpClient,
    @Inject('APP_CONFIG') appConfig: any,
    private setStore: SetStoreService
  ) {
    this.authUrl = new URL('/auth', appConfig.baseUrl).toString();
  }

  login(credentials: { username: string; password: string }): Observable<string> {
    return this.http
      .post(`${this.authUrl}/login`, credentials, { responseType: 'text' })
      .pipe(
        tap((token) => {
          this.saveToken(token);
          this.setStore.loadSets();
        }),
        catchError(this.handleError)
      );
  }

  register(credentials: { email?: string; username: string; password: string }): Observable<string> {
    return this.http
      .post(`${this.authUrl}/register`, credentials, { responseType: 'text' })
      .pipe(
        tap((token) => {
          this.saveToken(token);
          this.setStore.loadSets();
        }),
        catchError(this.handleError)
      );
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.http
      .post<void>(`${this.authUrl}/request-reset`, email, {
        headers: { 'Content-Type': 'text/plain' },
      })
      .pipe(catchError(this.handleError));
  }

  resetPassword(data: { token: string; newPassword: string }): Observable<void> {
    return this.http
      .post<void>(`${this.authUrl}/reset-password`, data)
      .pipe(catchError(this.handleError));
  }

  logout(): void {
    localStorage.removeItem(this.jwtKey);
    localStorage.removeItem(this.usernameKey);
    this.usernameSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.jwtKey);
  }

  private saveToken(token: string): void {
    const clean = this.cleanToken(token);
    localStorage.setItem(this.jwtKey, clean);
    this.extractUsernameFromToken(clean);
  }

  private cleanToken(token: string): string {
    return token.replace(/^"|"$/g, '');
  }

  private extractUsernameFromToken(token: string) {
    try {
      const payload = jwtDecode<{ username?: string }>(token);
      if (payload?.username) {
        this.setUsername(payload.username);
      } else {
        this.setUsername(null);
      }
    } catch (e) {
      console.warn('Failed to decode JWT token', e);
      this.setUsername(null);
    }
  }

  private setUsername(username: string | null): void {
    if (username === null) {
      localStorage.removeItem(this.usernameKey);
    } else {
      localStorage.setItem(this.usernameKey, username);
    }
    this.usernameSubject.next(username);
  }

  private handleError(error: HttpErrorResponse) {
    let message = 'An unknown error occurred!';
    if (error.status === 400) {
      message = 'Bad request. Please check your input.';
    } else if (error.status === 401) {
      message = 'Invalid username or password.';
    } else if (error.status === 409) {
      message = 'Username already exists.';
    }
    return throwError(() => new Error(message));
  }
}