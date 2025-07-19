import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ForgotPasswordRequest } from '../../models/forgot-password-request';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  message = '';
  isSuccess = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.message = '';

      const request: ForgotPasswordRequest = {
        email: this.forgotPasswordForm.get('email')?.value
      };

      this.authService.forgotPassword(request).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isSuccess = true;
          this.message = 'Password reset email sent successfully. Please check your email.';
        },
        error: (error) => {
          this.isLoading = false;
          this.isSuccess = false;
          this.message = error.error?.message || 'An error occurred. Please try again.';
        }
      });
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
} 