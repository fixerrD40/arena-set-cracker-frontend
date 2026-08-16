import { inject, Injectable, Inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { APP_CONFIG } from '../config/config.model';

export interface CloudSessionResponse {
  token: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authUrl: string;

  // 🌟 CONVERGED AUTH STATE: Initialized false on startup.
  // The UserProfileService will push 'true' to this channel when it loads the SQLite config row.
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public readonly isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();

  constructor(@Inject(APP_CONFIG) appConfig: any) {
    this.authUrl = new URL('/auth', appConfig.baseUrl).toString();
  }

  public isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.getValue();
  }

  /**
   * Pushes manual authentication flags into your stream channels
   */
  public setAuthenticationState(state: boolean): void {
    this.isAuthenticatedSubject.next(state);
  }

  /**
   * Called on a fresh device setup to restore a pre-existing cloud workspace.
   * 🌟 FIX: Uses "email" parameters matching your form inputs, and strips out localStorage loops.
   */
  public login(credentials: { email: string; password: string }): Observable<CloudSessionResponse> {
    return this.http
      .post<CloudSessionResponse>(`${this.authUrl}/login`, credentials)
      .pipe(
        tap(() => this.isAuthenticatedSubject.next(true)),
        catchError(this.handleError)
      );
  }

  /**
   * Bridges a local identity to the cloud.
   * 🌟 PRIVACY SECURITY FIX: Stripped out the tracking userUuid parameters entirely!
   * The server infers who the user is through their verified email credential context.
   */
  public claimOfflineAccount(credentials: { email: string; password: string }): Observable<CloudSessionResponse> {
    return this.http
      .post<CloudSessionResponse>(`${this.authUrl}/register`, credentials)
      .pipe(
        tap(() => this.isAuthenticatedSubject.next(true)),
        catchError(this.handleError)
      );
  }

  public requestPasswordReset(email: string): Observable<void> {
    return this.http
      .post<void>(`${this.authUrl}/request-reset`, email, {
        headers: { 'Content-Type': 'text/plain' },
      })
      .pipe(catchError(this.handleError));
  }

  public resetPassword(data: { token: string; newPassword: string }): Observable<void> {
    return this.http
      .post<void>(`${this.authUrl}/reset-password`, data)
      .pipe(catchError(this.handleError));
  }

  /**
   * Synchronous flush trigger to purge internal stream flags
   */
  public clearAuthenticationState(): void {
    this.isAuthenticatedSubject.next(false);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('[AuthService API Error]:', error.message || error);
    return throwError(() => new Error(error.error?.message || 'Authentication network request failed.'));
  }
}
