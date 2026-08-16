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
  selector: 'app-reset-password',
  standalone: true,
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
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css', '../auth.css', '../../features.css']
})
export class ResetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  public readonly form: FormGroup = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]] // Added a baseline length constraint for safety
  });

  public token: string | null = null;
  public error: string | null = null;
  public success = false;
  public isLoading = false;

  public ngOnInit(): void {
    // Extracts the url string parameter e.g., /reset-password?token=XYZ
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.error = 'Invalid, expired, or missing security token link.';
    }
  }

  public resetPassword(): void {
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
        this.form.reset();
      },
      error: (err) => {
        this.error = err.message;
        this.isLoading = false;
      }
    });
  }
}
