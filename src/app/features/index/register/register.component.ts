import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

// Custom Local Services
import { UserProfileService } from '../../../core/services/user-profile.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register-component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatIcon,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinner
  ],
  templateUrl: './register.component.html',
  styleUrls: ['register.component.css', '../auth.css', '../../features.css']
})
export class RegisterComponent implements OnInit {
  // Use modern token injection to keep the constructor clean
  private userProfileService = inject(UserProfileService);

  form: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.form = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      username: new FormControl({ value: '', disabled: true }, Validators.required),
      password: new FormControl('', Validators.required)
    });
  }

  ngOnInit(): void {
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

  register() {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isLoading = true;

    // 1. Extract your form values using getRawValue() so disabled fields are included
    const { email, username, password } = this.form.getRawValue();

    // 2. Fetch the hidden local configuration snapshot from your central cache
    const profileSnapshot = this.userProfileService.getSnapshot();

    if (!profileSnapshot) {
      this.isLoading = false;
      this.errorMessage = 'Local workspace profile identity is missing.';
      this.router.navigate(['/welcome']);
      return;
    }

    // 3. Construct the exact 4-parameter credential payload object your service expects
    const claimPayload = {
      email: email!,
      username: username!, // Captured from the form field we pre-filled
      password: password!,
      userUuid: profileSnapshot.user_uuid // Hidden UUID passed seamlessly behind the scenes!
    };

    // 4. Pass the unified payload object directly into the service stream
    this.authService
      .claimOfflineAccount(claimPayload)
      .subscribe({
        next: (response: any) => {
          // Commit the account variables to the central profile state disk cache
          this.userProfileService.saveCloudIdentity(response.userUuid, response.displayName).subscribe({
            next: () => {
              this.isLoading = false;
              this.router.navigate(['/']);
            },
            error: (fileErr) => {
              this.isLoading = false;
              console.error('Failed to update local user profile configuration file:', fileErr);
              this.errorMessage = 'Failed to lock secure profile structure down. Please retry.';
            }
          });
        },
        error: (err) => {
          this.isLoading = false;
          if (err.error?.message || err.message === 'Username already exists.') {
            this.errorMessage = err.error?.message || err.message;
          } else {
            this.errorMessage = 'Registration failed. Please try again.';
          }
        }
      });
  }
}
