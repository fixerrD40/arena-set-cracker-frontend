import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SetService } from '../../../core/services/set.service';

@Component({
  selector: 'app-welcome', // 🌟 Modernized to follow your explicit noun-first selector pattern
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
  styleUrl: './welcome.css' // 🌟 Swapped to modern singular styleUrl matching your file naming pass
})
export class WelcomeComponent {
  private readonly router = inject(Router);
  private readonly userProfile = inject(UserProfileService);
  private readonly setService = inject(SetService);

  // 🌟 Clean visibility: changed protected to public so it binds flawlessly to your welcome.html template variables
  public username = '';

  public configureApp(): void {
    const trimmedName = this.username.trim();
    if (!trimmedName) return;

    // Delegate identity creation to the central service coordinator
    this.userProfile.establishIdentity(trimmedName).subscribe({
      next: () => {
        console.log('WelcomeComponent: Identity confirmed. Hydrating local workspace caches...');

        // Populate in-memory datasets now that identity is established in SQLite
        this.setService.syncInstalledCache();

        // 🚀 EXPLICIT ROUTING: Pushes directly to /library to land on the dashboard instantly
        this.router.navigate(['/library']);
      },
      error: (err) => {
        console.error('Failed to initialize local workspace:', err);
      }
    });
  }
}
