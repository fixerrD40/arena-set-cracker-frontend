import { Component, inject, OnInit } from '@angular/core';
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
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-set-register', // 🌟 Modernized to follow your noun-first naming conventions
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule // 🌟 Use standard Module suffix to ensure clean compilation
  ],
  templateUrl: './register.html',
  styleUrls: ['register.css', '../auth.css', '../../features.css']
})
export class RegisterComponent implements OnInit {
  private readonly userProfileService = inject(UserProfileService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    username: new FormControl({ value: '', disabled: true }, Validators.required),
    password: new FormControl('', Validators.required)
  });

  public errorMessage: string | null = null;
  public isLoading = false;

  public ngOnInit(): void {
    // Read the pre-loaded username straight from the central memory cache stream
    this.userProfileService.displayName$.subscribe({
      next: (name) => {
        if (name) {
          this.form.patchValue({ username: name });
        } else {
          // If no local state name stream resolves, fallback redirect to welcome onboarding page
          this.router.navigate(['/welcome']);
        }
      },
      error: () => {
        this.router.navigate(['/welcome']);
      }
    });
  }

  public register(): void {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isLoading = true;

    // Extract your form values using getRawValue() so disabled fields are included
    const { email, password } = this.form.getRawValue();

    // Fetch the hidden local configuration snapshot from your central cache
    const profileSnapshot = this.userProfileService.getSnapshot();

    if (!profileSnapshot) {
      this.isLoading = false;
      this.errorMessage = 'Local workspace profile identity is missing.';
      this.router.navigate(['/welcome']);
      return;
    }

    // 🚀 PRIVACY STRATEGY MATCH: Send exactly TWO credentials up over the wire request lines.
    // Your backend server registers this email and returns an opaque session token.
    this.authService
      .claimOfflineAccount({ email: email!, password: password! })
      .subscribe({
        next: (response: { token: string; displayName: string }) => {

          // 🌟 CONVERGED SYSTEM PASS: Promotes your local profile row inside SQLite to a cloud state
          this.userProfileService.linkLocalProfileToCloud(response.token).subscribe({
            next: () => {
              this.isLoading = false;

              // 🚀 Transition views directly to the main workspace grid safely
              this.router.navigate(['/library']);
            },
            error: (dbErr) => {
              this.isLoading = false;
              console.error('[Register] Failed to promote profile row inside SQLite:', dbErr);
              this.errorMessage = 'Failed to lock secure profile configuration structure down. Please retry.';
            }
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.message || 'Registration request failed. Please verify your credentials.';
        }
      });
  }
}
