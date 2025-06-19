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

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinner
  ],
  templateUrl: './register.html',
  styleUrls: ['../auth.css', '../../components.css']
})
export class Register {
  form = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  errorMessage: string | null = null;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  register() {
    if (this.form.invalid) return;

    this.errorMessage = null;
    this.isLoading = true;

    const { username, password } = this.form.value;

    this.authService.register({ username: username!, password: password! }).subscribe({
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