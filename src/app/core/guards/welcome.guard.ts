import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserProfileService } from '../services/user-profile.service';
import { SetService } from '../services/set.service';

/**
 * On boot: configured sessions sync the set cache and skip the landing root;
 * unconfigured sessions are limited to index / onboarding routes.
 */
export const welcomeGuard: CanActivateFn = (
  _,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> => {
  const userProfile = inject(UserProfileService);
  const setService = inject(SetService);
  const router = inject(Router);

  return userProfile.initializeConfig().pipe(
    map((isConfigured: boolean) => {
      if (isConfigured) {
        setService.syncInstalledCache();

        if (state.url === '/' || state.url === '') {
          return router.createUrlTree(['/library']);
        }

        return true;
      }

      if (state.url === '/' || state.url === '') {
        return true;
      }

      if (state.url === userProfile.onboardingTargetRoute) {
        return true;
      }

      console.warn(`[WelcomeGuard] Unconfigured workspace blocked accessing deep route: ${state.url}`);
      return router.createUrlTree([userProfile.onboardingTargetRoute]);
    })
  );
};
