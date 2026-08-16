// src/app/core/services/user-profile.service.ts
import { Injectable, inject, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { systemConfig } from '../sqlite/sqlite.schema';
import { DATA_WIRE_TOKEN } from './data-wire/data-wire.contract';
import { APP_CONFIG } from '../config/config.model';
import { mapProfileToInsert } from '../../shared/models/user/user.mappers';
import { UserProfile } from '../../shared/models/user/user';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly dataWire = inject(DATA_WIRE_TOKEN);
  private readonly authService = inject(AuthService);

  public readonly onboardingTargetRoute: string;

  private readonly configSubject = new BehaviorSubject<UserProfile | null>(null);
  public readonly config$ = this.configSubject.asObservable();

  public readonly displayName$ = this.config$.pipe(map(c => c?.displayName || null));
  public readonly isCloudSynced$ = this.config$.pipe(map(c => !!c?.isCloudSynced));
  public readonly lastSync$ = this.config$.pipe(map(c => c?.lastSyncTimestamp || null));

  public get isCloudSynced(): boolean {
    return this.getSnapshot()?.isCloudSynced || false;
  }

  constructor(@Inject(APP_CONFIG) appConfig: any) {
    // Standard routing target fallback parameters across all client environments
    this.onboardingTargetRoute = appConfig.isElectron ? '/welcome' : '/login';
  }

  public initializeConfig(): Observable<boolean> {
    return this.dataWire.fetchRecord<any>(systemConfig, 'active_user').pipe(
      map((row) => {
        if (!row || !row.displayName) return null;
        return {
          displayName: row.displayName,
          sessionToken: row.sessionToken,
          isCloudSynced: row.isCloudSynced,
          lastSyncTimestamp: row.lastSyncTimestamp
        } as UserProfile;
      }),
      tap((config) => {
        this.configSubject.next(config);

        // 🚀 CONVERGED SYNCHRONIZATION: Sync your AuthService state to match your database row health!
        const hasActiveSession = !!(config && config.sessionToken);
        this.authService.setAuthenticationState(hasActiveSession);
      }),
      map((config) => !!(config && config.displayName)),
      catchError(() => {
        this.configSubject.next(null);
        this.authService.clearAuthenticationState();
        return of(false);
      })
    );
  }

  /**
   * Scenario A: First-Time Desktop Local Profile Creation
   */
  public establishIdentity(name: string): Observable<void> {
    const domainModel: UserProfile = {
      displayName: name.trim(),
      sessionToken: null,
      isCloudSynced: false,
      lastSyncTimestamp: null
    };

    // 🚀 Converts our domain model straight to a Drizzle payload using the output mapper
    const dbPayload = mapProfileToInsert(domainModel);

    return this.dataWire.insert(systemConfig, dbPayload).pipe(
      tap(() => this.configSubject.next(domainModel)),
      map(() => void 0)
    );
  }

  /**
   * Scenario B: Promoting an Existing Local Identity to Cloud Tracking
   */
  public linkLocalProfileToCloud(sessionToken: string): Observable<void> {
    const current = this.getSnapshot();
    if (!current) return of(void 0);

    const updatedProfile: UserProfile = {
      ...current,
      sessionToken: sessionToken,
      isCloudSynced: true,
      lastSyncTimestamp: new Date().toISOString()
    };

    const dbPayload = mapProfileToInsert(updatedProfile);

    return this.dataWire.update(systemConfig, dbPayload).pipe(
      tap(() => this.configSubject.next(updatedProfile)),
      map(() => void 0)
    );
  }

  /**
   * Scenario C: Cold Rehydration Recovery from Cloud Server Payload
   */
  public restoreCloudIdentity(serverPayload: { token: string; name: string }): Observable<void> {
    const restoredProfileRow = {
      id: 'active_user',
      displayName: serverPayload.name.trim(),
      sessionToken: serverPayload.token,
      isCloudSynced: true,
      lastSyncTimestamp: new Date().toISOString()
    };

    const domainModel: UserProfile = {
      displayName: restoredProfileRow.displayName,
      sessionToken: restoredProfileRow.sessionToken,
      isCloudSynced: true,
      lastSyncTimestamp: restoredProfileRow.lastSyncTimestamp
    };

    // Insert acts as an overwrite due to the hardcoded primary key 'active_user'
    return this.dataWire.insert(systemConfig, restoredProfileRow).pipe(
      tap(() => this.configSubject.next(domainModel)),
      map(() => void 0)
    );
  }

  /**
   * Updates timestamp flags inside your database tracking schemas post-sync completion
   */
  public updateCloudSyncStatus(timestamp: string = new Date().toISOString()): Observable<void> {
    const current = this.getSnapshot();
    if (!current) return of(void 0);

    // 1. Construct the complete, unified domain model profile snapshot
    const updatedProfile: UserProfile = {
      ...current,
      isCloudSynced: true,
      lastSyncTimestamp: timestamp
    };

    // 2. Map the domain model directly to the schema insert layout required by Drizzle
    // This injects the required primary key constraint "id: 'active_user'" automatically
    const dbPayload = mapProfileToInsert(updatedProfile);

    // 3. Pass EXACTLY two parameters to the data wire to satisfy your contract's reflection logic
    return this.dataWire.update(systemConfig, dbPayload).pipe(
      tap(() => this.configSubject.next(updatedProfile)),
      map(() => void 0)
    );
  }

  public getSnapshot(): UserProfile | null {
    return this.configSubject.getValue();
  }

  /**
   * FACTORY MASTER RESET
   * Destroys the active row, flushing the configuration profile state completely.
   */
  public clearConfig(): Observable<void> {
    return this.dataWire.delete(systemConfig, 'active_user').pipe(
      tap(() => this.configSubject.next(null)),
      map(() => void 0),
      catchError(() => {
        this.configSubject.next(null);
        return of(void 0);
      })
    );
  }
}
