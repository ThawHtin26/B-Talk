import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from '../../models/register-request';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const registerData: RegisterRequest = {
        email: this.registerForm.value.email!,
        firstName: this.registerForm.value.firstName!,
        lastName: this.registerForm.value.lastName || '', // fallback if null/undefined
        password: this.registerForm.value.password!
      };

      this.authService.register(registerData).subscribe({
        next: () => this.router.navigate(['/']),
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Registration failed';
        }
      });
    }
  }
}
