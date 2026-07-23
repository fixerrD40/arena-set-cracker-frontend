import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserProfileService } from '../services/user-profile.service';
import { SetService } from '../services/set.service'; // 1. IMPORT DATA SERVICE
import { map } from 'rxjs';

export const welcomeGuard: CanActivateFn = () => {
  const userProfileService = inject(UserProfileService);
  const setService = inject(SetService); // 2. INJECT DATABASE SERVICE INTERFACE
  const router = inject(Router);

  // Invoke the centralized service to initialize and verify the profile state
  return userProfileService.initializeConfig().pipe(
    map((isConfigured: boolean) => {
      // Flow A: Returning User has a healthy identity file
      if (isConfigured) {
        console.log('welcomeGuard: Profile confirmed. Initializing in-memory relational cache...');

        // 3. RETURNING USER HANDOVER: Warm up database cache arrays as they clear the gate!
        setService.syncInstalledCache();
        return true;
      }

      // Flow B: Brand new install -> Route to Interactive Welcome Onboarding Runner
      console.log('welcomeGuard: Unconfigured system. Diverting to welcome onboarding runner.');
      return router.createUrlTree(['/welcome']);
    })
  );
};
