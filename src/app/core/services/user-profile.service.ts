import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { FileSystemService } from './file-system.service';

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

  // FIXED TYPE: Changed BehaviorSubject type target from AppConfig to UserProfile
  private readonly configSubject = new BehaviorSubject<UserProfile | null>(null);
  public readonly config$ = this.configSubject.asObservable();

  public readonly displayName$ = this.config$.pipe(map(c => c?.display_name || null));

  /**
   * Initializes the configuration on application startup.
   * Resolves true if a valid identity exists, false if onboarding is required.
   */
  public initializeConfig(): Observable<boolean> {
    // FIXED TYPE: Map file readout directly into your UserProfile structure
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
    // FIXED TYPE: Instantiated as a clean UserProfile data object
    const newConfig: UserProfile = {
      user_uuid: crypto.randomUUID(),
      display_name: name.trim(),
      is_cloud_synced: false,
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
    // FIXED TYPE: Instantiated as a clean UserProfile data object
    const syncedConfig: UserProfile = {
      user_uuid: uuid,
      display_name: name.trim(),
      is_cloud_synced: true,
      last_sync_timestamp: new Date().toISOString()
    };

    return this.fileSystem.writeJsonFile(this.USER_FILE, syncedConfig).pipe(
      tap(() => this.configSubject.next(syncedConfig))
    );
  }

  /**
   * Synchronous lookups for edge cases or guards
   */
  public getSnapshot(): UserProfile | null { // FIXED TYPE
    return this.configSubject.getValue();
  }

  /**
   * Deletes config profile data (called during hard factory resets)
   */
  public clearConfig(): Observable<void> {
    this.configSubject.next(null);
    // FIXED VARIABLE: Changed this.CONFIG_FILE to this.USER_FILE
    return this.fileSystem.writeJsonFile(this.USER_FILE, {});
  }
}
