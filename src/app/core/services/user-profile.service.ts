import { Inject, inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { FileSystemService } from './file-system.service';
import { APP_CONFIG } from '../config/config.model';

export interface UserProfile {
  user_uuid: string;
  display_name: string;
  is_cloud_synced: boolean;
  last_sync_timestamp: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly fileSystem = inject(FileSystemService);
  private readonly USER_FILE = 'user_profile.json';
  public readonly onboardingTargetRoute;

  private readonly configSubject = new BehaviorSubject<UserProfile | null>(null);
  public readonly config$ = this.configSubject.asObservable();

  public readonly displayName$ = this.config$.pipe(map(c => c?.display_name || null));

  // 🌟 CLOUD AWARENESS STATE STRINGS
  public readonly isCloudSynced$ = this.config$.pipe(map(c => !!c?.is_cloud_synced));
  public readonly lastSync$ = this.config$.pipe(map(c => c?.last_sync_timestamp || null));

  constructor(
    @Inject(APP_CONFIG) appConfig: any
  ) {
    this.onboardingTargetRoute = appConfig.isElectron ? '/welcome' : '/login';
  }

  /**
   * Initializes the configuration on application startup.
   * Resolves true if a valid identity exists, false if onboarding is required.
   */
  public initializeConfig(): Observable<boolean> {
    return this.fileSystem.readJsonFile<UserProfile>(this.USER_FILE).pipe(
      tap((config) => this.configSubject.next(config)),
      map((config) => !!(config && config.user_uuid && config.display_name)),
      catchError(() => {
        this.configSubject.next(null);
        return of(false);
      })
    );
  }

  /**
   * Creates a fresh local profile (called from Welcome screen)
   */
  public establishIdentity(name: string): Observable<void> {
    const newConfig: UserProfile = {
      user_uuid: crypto.randomUUID(),
      display_name: name.trim(),
      is_cloud_synced: false, // Desktop local-first start state
      last_sync_timestamp: null
    };

    return this.fileSystem.writeJsonFile(this.USER_FILE, newConfig).pipe(
      tap(() => this.configSubject.next(newConfig))
    );
  }

  /**
   * Promotes a local profile to a cloud-linked state (called from Login/Register)
   */
  public saveCloudIdentity(uuid: string, name: string): Observable<void> {
    const syncedConfig: UserProfile = {
      user_uuid: uuid,
      display_name: name.trim(),
      is_cloud_synced: true, // Web default state / Desktop promoted state
      last_sync_timestamp: new Date().toISOString()
    };

    return this.fileSystem.writeJsonFile(this.USER_FILE, syncedConfig).pipe(
      tap(() => this.configSubject.next(syncedConfig))
    );
  }

  /**
   * 🌟 CLOUD TRANSACTION LANE: Marks a local profile as uploaded to cloud
   * Use this when an offline Electron user pushes their data to the server for the first time.
   */
  public updateCloudSyncStatus(timestamp: string = new Date().toISOString()): Observable<void> {
    const current = this.getSnapshot();
    if (!current) return of(void 0);

    const updatedConfig: UserProfile = {
      ...current,
      is_cloud_synced: true,
      last_sync_timestamp: timestamp
    };

    return this.fileSystem.writeJsonFile(this.USER_FILE, updatedConfig).pipe(
      tap(() => this.configSubject.next(updatedConfig))
    );
  }

  /**
   * Synchronous lookups for edge cases or guards
   */
  public getSnapshot(): UserProfile | null {
    return this.configSubject.getValue();
  }

  /**
   * Deletes config profile data (called during hard factory resets)
   */
  public clearConfig(): Observable<void> {
    this.configSubject.next(null);
    return this.fileSystem.writeJsonFile(this.USER_FILE, {});
  }
}
