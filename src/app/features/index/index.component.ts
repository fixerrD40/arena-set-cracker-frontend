import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SetService } from '../../core/services/set.service';
import { UserProfileService } from '../../core/services/user-profile.service';

@Component({
  selector: 'app-index',
  standalone: true,
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css'],
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class Index implements OnInit {
  private readonly router = inject(Router);
  private readonly userProfile = inject(UserProfileService);
  private readonly setService = inject(SetService);

  // Hidden initially to prevent action flickers while loading config from disk
  public readonly showDefaultAction = signal<boolean>(false);

  public ngOnInit(): void {
    // 🌟 AUTO-FORWARD EXCLUSION ROUTING LANE
    this.userProfile.initializeConfig().subscribe(isValidProfile => {
      if (isValidProfile) {
        console.log('[Index] Valid profile context confirmed. Fast-tracking to Library.');
        this.setService.syncInstalledCache();
        this.router.navigate(['/library']);
      } else {
        this.showDefaultAction.set(true);
      }
    });
  }

  /**
   * Primary action dispatcher for onboarding destinations.
   */
  public handleGetStartedClick(): void {
    if (this.userProfile.getSnapshot()?.user_uuid) {
      this.setService.syncInstalledCache();
      this.router.navigate(['/library']);
      return;
    }

    const targetRoute = this.userProfile.getOnboardingTargetRoute();
    console.log(`[Index] Routing unconfigured user to platform target: ${targetRoute}`);
    this.router.navigate([targetRoute]);
  }
}
