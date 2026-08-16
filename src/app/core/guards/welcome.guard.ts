import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserProfileService } from '../services/user-profile.service';
import { SetService } from '../services/set.service';

/**
 * AUTHORITATIVE INTERCEPTOR GUARD
 * Evaluates the merged SQLite brain on boot. Routing unconfigured or wiped sessions
 * to their unified onboarding target, and driving valid sessions straight to the cache sync layer.
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

      // ==========================================
      // 1. IF CONFIGURED (The Merged SQLite Brain is Healthy)
      // ==========================================
      if (isConfigured) {
        // Rehydrate the cached local expansions list out of SQLite straight into state subjects
        setService.syncInstalledCache();

        // Traffic cop: If they are resting on the bare landing root, push them directly to their grid
        if (state.url === '/' || state.url === '') {
          return router.createUrlTree(['/library']);
        }

        // Let verified sessions pass through unimpeded to deep links (/add-set, /deck/:id)
        return true;
      }

      // ==========================================
      // 2. IF UNCONFIGURED (Volatile Wipe, Cache Cleared, or First Boot)
      // ==========================================

      // Let them land on the entry index screen without throws or loop traps
      if (state.url === '/' || state.url === '') {
        return true;
      }

      // If they are on your unified onboarding location (/welcome or /login via config tracking), let them through
      if (state.url === userProfile.onboardingTargetRoute) {
        return true;
      }

      // Intercept any manual deep links typed while local context is blank and redirect to their platform entry pad
      console.warn(`[WelcomeGuard] Unconfigured workspace blocked accessing deep route: ${state.url}`);
      return router.createUrlTree([userProfile.onboardingTargetRoute]);
    })
  );
};
