import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Custom Local Services
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-request-password-reset',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './request-password-reset.html'
})
export class RequestPasswordResetComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  public readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  public error: string | null = null;
  public success = false;
  public isLoading = false;

  public requestReset(): void {
    if (this.form.invalid) return;

    this.error = null;
    this.success = false;
    this.isLoading = true;

    this.auth.requestPasswordReset(this.form.value.email!).subscribe({
      next: () => {
        this.success = true;
        this.isLoading = false;
        this.form.reset(); // 🚀 Best practice: Reset the input field upon network dispatch completion
      },
      error: (err) => {
        this.error = err.message;
        this.isLoading = false;
      }
    });
  }
}
