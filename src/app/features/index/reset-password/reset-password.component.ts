import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

// Angular Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner'; // Standardized Component Link

// Custom Local Services
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password-component',
  standalone: true, // Marked explicitly for standalone compiler clarity
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule, // Added to support your new template routerLink transitions safely
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinner // Swapped from Module wrapper format
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css', '../auth.css', '../../features.css']
})
export class ResetPasswordComponent implements OnInit {
  // Use modern token injection to match your Login and Register components
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  form: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required]]
  });

  token: string | null = null;
  error: string | null = null;
  success = false;
  isLoading = false;

  ngOnInit(): void {
    // Extracts the url string parameter e.g., /reset-password?token=XYZ
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.error = 'Invalid or missing token.';
    }
  }

  resetPassword() {
    if (!this.token || this.form.invalid) return;

    this.error = null;
    this.isLoading = true;

    this.auth.resetPassword({
      token: this.token,
      newPassword: this.form.value.newPassword!
    }).subscribe({
      next: () => {
        this.success = true;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.isLoading = false;
      }
    });
  }
}
