import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserProfileService } from '../services/user-profile.service';

/** Requires a configured profile with a session token. */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const userProfileService = inject(UserProfileService);
  const router = inject(Router);

  return userProfileService.initializeConfig().pipe(
    map((isConfigured: boolean) => {
      const profile = userProfileService.getSnapshot();
      const hasActiveSession = !!(profile && profile.sessionToken);

      if (isConfigured && hasActiveSession) {
        return true;
      }

      console.warn('[AuthGuard] Blocked unauthorized entry attempt to cloud-sync pipeline channels.');
      return router.createUrlTree(['/login']);
    })
  );
};
