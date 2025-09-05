import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth-service';

@Component({
  selector: 'app-request-password-reset',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './request-password-reset.html',
  styleUrls: ['./request-password-reset.css', '../auth.css', '../../components.css']
})
export class RequestPasswordReset {
  form: FormGroup;
  error: string | null = null;
  success = false;
  isLoading = false;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  requestReset() {
    if (this.form.invalid) return;

    this.error = null;
    this.success = false;
    this.isLoading = true;

    this.auth.requestPasswordReset(this.form.value.email!).subscribe({
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
