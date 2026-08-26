import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SetService } from '../../core/services/set.service';
import { UserProfileService } from '../../core/services/user-profile.service';

@Component({
  selector: 'app-index',
  standalone: true,
  templateUrl: './index.html',
  styleUrls: ['./index.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class IndexComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly userProfile = inject(UserProfileService);
  private readonly setService = inject(SetService);

  // Hidden until config check finishes to avoid action flicker
  public readonly showDefaultAction = signal<boolean>(false);

  public ngOnInit(): void {
    const currentProfile = this.userProfile.getSnapshot();

    if (currentProfile && currentProfile.displayName) {
      console.log('[Index] Active memory profile context confirmed. Fast-tracking straight to Library.');
      this.setService.syncInstalledCache();
      this.router.navigate(['/library']);
    } else {
      this.showDefaultAction.set(true);
    }
  }

  public handleGetStartedClick(): void {
    const currentProfile = this.userProfile.getSnapshot();

    if (currentProfile && currentProfile.displayName) {
      this.setService.syncInstalledCache();
      this.router.navigate(['/library']);
      return;
    }

    const targetRoute = this.userProfile.onboardingTargetRoute;
    console.log(`[Index] Routing unconfigured session to platform target path: ${targetRoute}`);
    this.router.navigate([targetRoute]);
  }
}
