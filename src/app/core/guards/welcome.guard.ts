import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs/operators';
import { UserProfileService } from '../services/user-profile.service';
import { SetService } from '../services/set.service';

// Removed the unused 'route' parameter completely to satisfy the TS compiler
export const welcomeGuard: CanActivateFn = (_, state: RouterStateSnapshot) => {
  const userProfile = inject(UserProfileService);
  const setService = inject(SetService);
  const router = inject(Router);

  return userProfile.initializeConfig().pipe(
    map((isConfigured: boolean) => {

      // 1. IF CONFIGURED -> Force them forward to the dashboard if they are resting on the root
      if (isConfigured) {
        setService.syncInstalledCache();

        if (state.url === '/' || state.url === '') {
          return router.createUrlTree(['/library']);
        }
        return true; // Let them through to protected data links (/add-set, /deck/:id)
      }

      // 2. IF UNCONFIGURED -> Only let them pass if they are standing on the index page
      if (state.url === '/' || state.url === '') {
        return true;
      }

      // If they manually try to type a deep link while unconfigured, redirect to their explicit onboarding path
      return router.createUrlTree([userProfile.getOnboardingTargetRoute()]);
    })
  );
};
