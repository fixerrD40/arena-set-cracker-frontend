import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth-service';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css', '../auth.css', '../../components.css']
})
export class ResetPassword implements OnInit {
  form: FormGroup;
  token: string | null = null;
  error: string | null = null;
  success = false;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private auth: AuthService
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
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