import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

// Custom Services
import { UserProfileService } from '../../../core/services/user-profile.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinner
  ],
  templateUrl: './login.component.html',
  styleUrls: ['login.component.css', '../auth.css', '../../features.css']
})
export class LoginComponent {
  // Inject your unified profile service manager
  private userProfileService = inject(UserProfileService);

  form = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  error: string | null = null;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    if (this.form.invalid) return;

    this.error = null;
    this.isLoading = true;

    const { username, password } = this.form.value;

    this.authService.login({ username: username!, password: password! }).subscribe({
      next: (response: any) => {

        // Use the centralized method to commit the server profile payload to the cache and hard drive
        this.userProfileService.saveCloudIdentity(response.userUuid, response.displayName).subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/']); // Transition views safely after IO processing concludes
          },
          error: (fileErr) => {
            this.isLoading = false;
            console.error('Central profile state compilation failure:', fileErr);
            this.error = 'Failed to compile local secure profile. Please retry.';
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.message || 'Invalid username or password';
      }
    });
  }
}
