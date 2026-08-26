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
  selector: 'app-set-register',
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
    MatProgressSpinnerModule
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
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
    this.userProfileService.displayName$.subscribe({
      next: (name) => {
        if (name) {
          this.form.patchValue({ username: name });
        } else {
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

    // getRawValue includes disabled controls (username)
    const { email, password } = this.form.getRawValue();

    const profileSnapshot = this.userProfileService.getSnapshot();

    if (!profileSnapshot) {
      this.isLoading = false;
      this.errorMessage = 'Local workspace profile identity is missing.';
      this.router.navigate(['/welcome']);
      return;
    }

    // Register with email + password only; link returned token to local SQLite profile
    this.authService
      .claimOfflineAccount({ email: email!, password: password! })
      .subscribe({
        next: (response: { token: string; displayName: string }) => {
          this.userProfileService.linkLocalProfileToCloud(response.token).subscribe({
            next: () => {
              this.isLoading = false;
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
