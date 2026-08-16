import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserProfileService } from '../services/user-profile.service';

/**
 * AUTHORITATIVE CLOUD ACCESSIBILITY GUARD
 * Probes the unified SQLite brain to verify if a valid, authenticated session
 * token exists before letting the browser access secure server backup utilities.
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const userProfileService = inject(UserProfileService);
  const router = inject(Router);

  // 🚀 REFACTORED: Read right from your central, database-driven configuration stream
  return userProfileService.initializeConfig().pipe(
    map((isConfigured: boolean) => {
      // Fetch a fast memory snapshot to check if the active profile is fully cloud-synced
      const profile = userProfileService.getSnapshot();
      const hasActiveSession = !!(profile && profile.sessionToken);

      if (isConfigured && hasActiveSession) {
        return true;
      }

      // 🛡️ Unauthorized Protection: Kick them smoothly back to the cloud sign-in screen
      console.warn('[AuthGuard] Blocked unauthorized entry attempt to cloud-sync pipeline channels.');
      return router.createUrlTree(['/login']);
    })
  );
};
