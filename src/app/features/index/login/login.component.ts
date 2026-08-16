import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login', // 🌟 Matches your modern noun-first naming standards
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule // 🌟 Use standard Module suffix to ensure clean compilation
  ],
  templateUrl: './login.html',
  styleUrls: ['login.css', '../auth.css', '../../features.css']
})
export class LoginComponent {
  // Use pure standalone inject parameters instead of mixing constructor assignments
  private readonly userProfileService = inject(UserProfileService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // 🌟 REFACTORED FORM FIELDS: Replaced legacy "username" with strict, validation-safe "email"
  public readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required)
  });

  public error: string | null = null;
  public isLoading = false;

  public login(): void {
    if (this.form.invalid) return;

    this.error = null;
    this.isLoading = true;

    const { email, password } = this.form.value;

    // 🚀 Send the plain-text email safely over the active network stream context line
    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (response: { token: string; displayName: string }) => {

        // 🌟 ARCHITECTURE MATCH: Commits the server session credentials directly into the unified SQLite brain
        this.userProfileService.restoreCloudIdentity({
          token: response.token,
          name: response.displayName
        }).subscribe({
          next: () => {
            this.isLoading = false;

            // 🚀 Explicitly route directly to your library page to bypass guard loop re-evaluations
            this.router.navigate(['/library']);
          },
          error: (dbErr) => {
            this.isLoading = false;
            console.error('[Login] SQLite configuration ingestion failed:', dbErr);
            this.error = 'Failed to write your cloud secure configuration. Please try again.';
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.message || 'Invalid email address or password configuration.';
      }
    });
  }
}
