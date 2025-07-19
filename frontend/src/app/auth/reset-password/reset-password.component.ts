import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ResetPasswordRequest } from '../../models/reset-password-request';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  isLoading = false;
  message = '';
  isSuccess = false;
  resetToken = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.resetToken = this.route.snapshot.queryParams['token'];
    if (!this.resetToken) {
      this.message = 'Invalid reset link. Please request a new password reset.';
      this.isSuccess = false;
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid && this.resetToken) {
      this.isLoading = true;
      this.message = '';

      const request: ResetPasswordRequest = {
        resetToken: this.resetToken,
        newPassword: this.resetPasswordForm.get('newPassword')?.value
      };

      this.authService.resetPassword(request).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isSuccess = true;
          this.message = 'Password reset successfully. You can now login with your new password.';
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
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

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
} 