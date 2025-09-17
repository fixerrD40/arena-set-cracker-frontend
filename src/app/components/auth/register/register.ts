import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.html',
  styleUrls: ['register.css', '../auth.css', '../../components.css']
})
export class Register {
  form: FormGroup;

  errorMessage: string | null = null;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {
    this.form = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      username: new FormControl('', Validators.required),
      password: new FormControl('', Validators.required)
    });
  }

  register() {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isLoading = true;

    const { email, username, password } = this.form.value;

    this.authService
      .register({ email: email!, username: username!, password: password! })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.isLoading = false;
          if (err.message === 'Username already exists.') {
            this.errorMessage = err.message;
          } else {
            this.errorMessage = 'Registration failed. Please try again.';
          }
        }
      });
  }
}