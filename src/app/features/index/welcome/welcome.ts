import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

// Custom Central Services
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SetService } from '../../../core/services/set.service'; // 1. IMPORT DATA CONTEXT

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './welcome.html',
  styleUrls: ['./welcome.css']
})
export class WelcomeComponent {
  private readonly router = inject(Router);
  private readonly userProfile = inject(UserProfileService);
  private readonly setService = inject(SetService); // 2. INJECT DATABASE SERVICE

  protected username = '';

  protected configureApp(): void {
    const trimmedName = this.username.trim();
    if (!trimmedName) return;

    // Delegate identity creation to the central service coordinator
    this.userProfile.establishIdentity(trimmedName).subscribe({
      next: () => {
        console.log('WelcomeComponent: Identity confirmed. Hydrating local workspace caches...');

        // 3. THE HANDOVER TRIGGER: Populate in-memory datasets now that identity is established
        this.setService.syncInstalledCache();

        // Safe sequential view change after the hardware writes finish processing
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Failed to initialize local workspace:', err);
      }
    });
  }
}
