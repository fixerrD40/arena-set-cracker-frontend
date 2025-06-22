import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';

import { SetStoreService } from './set-store-service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private registrationUrl: string;
  private authenticationUrl: string;
  private usernameKey = 'username';
  private jwtKey = 'jwt';

  private usernameSubject = new BehaviorSubject<string | null>(
    localStorage.getItem(this.usernameKey)
  );
  username$ = this.usernameSubject.asObservable();

  constructor(
    protected http: HttpClient,
    @Inject('APP_CONFIG') appConfig: any,
    private setStore: SetStoreService
  ) {
    this.registrationUrl = new URL('/register', appConfig.baseUrl).toString();
    this.authenticationUrl = new URL('/authenticate', appConfig.baseUrl).toString();
  }

  register(credentials: { username: string; password: string }): Observable<string> {
    return this.http
      .post(this.registrationUrl, credentials, { responseType: 'text' })
      .pipe(
        tap((token) => {
        this.saveToken(token);
        this.setStore.loadSets();
        }),
        catchError(this.handleError)
      );
  }

  login(credentials: { username: string; password: string }): Observable<string> {
    return this.http
      .post(this.authenticationUrl, credentials, { responseType: 'text' })
      .pipe(
        tap((token) => {
        this.saveToken(token);
        this.setStore.loadSets();
        }),
        catchError(this.handleError)
      );
  }

  private cleanToken(token: string): string {
    return token.replace(/^"|"$/g, '');
  }

  getToken(): string | null {
    return localStorage.getItem(this.jwtKey);
  }

  private saveToken(token: string): void {
    localStorage.setItem(this.jwtKey, this.cleanToken(token));
    this.extractUsernameFromToken(token);
  }

  private extractUsernameFromToken(token: string) {
    try {
      const payload = jwtDecode<JwtPayload>(token);
      if (payload && payload.username) {
        this.setUsername(payload.username);
      } else {
        this.setUsername(null);
      }
    } catch (e) {
      console.warn('Failed to decode JWT token', e);
      this.setUsername(null);
    }
  }

  logout(): void {
    localStorage.removeItem(this.jwtKey);
    localStorage.removeItem(this.usernameKey);
    this.setStore.clear;
    this.usernameSubject.next(null);
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
