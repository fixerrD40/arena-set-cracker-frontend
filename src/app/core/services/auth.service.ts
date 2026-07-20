import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { APP_CONFIG } from '../config/config.tokens';

export interface CloudSessionResponse {
  token: string;
  userUuid: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authUrl: string;
  private jwtKey = 'jwt';

  // 1. Core State: Initialize true if a token exists, false if not
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(!!this.getToken());

  // 2. Public Stream: Read-only stream for components and router guards
  readonly isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();

  constructor(
    protected http: HttpClient,
    @Inject(APP_CONFIG) appConfig: any
  ) {
    this.authUrl = new URL('/auth', appConfig.baseUrl).toString();
  }

  /**
   * SYNCHRONOUS SNAPSHOT: Allows services like the OutboxService to check
   * the immediate login state without needing to subscribe to an observable thread.
   */
  public isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.getValue();
  }

  /**
   * Called on a fresh device setup to restore a pre-existing cloud workspace.
   * Resolves the server profile object to seed user-profile.service.ts
   */
  login(credentials: { username: string; password: string }): Observable<CloudSessionResponse> {
    return this.http
      .post<CloudSessionResponse>(`${`${this.authUrl}/login`}`, credentials)
      .pipe(
        tap((response) => {
          this.saveToken(response.token);
          this.isAuthenticatedSubject.next(true);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Bridges a pre-established local offline identity to the cloud.
   * Sends email, password, and the hidden userUuid up to the network.
   */
  claimOfflineAccount(credentials: { email?: string; username: string; password: string; userUuid: string }): Observable<CloudSessionResponse> {
    return this.http
      .post<CloudSessionResponse>(`${`${this.authUrl}/register`}`, credentials)
      .pipe(
        tap((response) => {
          this.saveToken(response.token),
          this.isAuthenticatedSubject.next(true);
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
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.jwtKey);
  }

  /**
   * Helper extracting structural parameters out of active session keys if needed
   */
  getUserIdentityFromToken(): { username: string | null; userUuid: string | null } {
    const token = this.getToken();
    if (!token) return { username: null, userUuid: null };

    try {
      const payload = jwtDecode<{ username?: string; userUuid?: string }>(token);
      return {
        username: payload?.username || null,
        userUuid: payload?.userUuid || null
      };
    } catch (e) {
      console.warn('Failed to decode active network session payload framework:', e);
      return { username: null, userUuid: null };
    }
  }

  private saveToken(token: string): void {
    const clean = this.cleanToken(token);
    localStorage.setItem(this.jwtKey, clean);
  }

  private cleanToken(token: string): string {
    return token.replace(/^"|"$/g, '');
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
