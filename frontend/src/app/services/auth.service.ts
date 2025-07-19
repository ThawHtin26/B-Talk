import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { LoginRequest } from '../models/login-request';
import { RegisterRequest } from '../models/register-request';
import { ForgotPasswordRequest } from '../models/forgot-password-request';
import { ResetPasswordRequest } from '../models/reset-password-request';
import { AuthResponse} from '../models/auth-response';
import { ApiResponse } from '../models/api-response';
import { UserResponse } from '../models/user-response';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;
  private tokenSubject: BehaviorSubject<string | null>;
  private refreshTokenSubject: BehaviorSubject<string | null>;
  private isRefreshing = false;

  constructor() {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    this.tokenSubject = new BehaviorSubject<string | null>(token);
    this.refreshTokenSubject = new BehaviorSubject<string | null>(refreshToken);
  }

  getToken(): string | null {
    const token = this.tokenSubject.value;
    if (token) return token;

    const localToken = localStorage.getItem('token');
    if (localToken) {
      this.tokenSubject.next(localToken);
      return localToken;
    }

    return null;
  }

  getRefreshToken(): string | null {
    const refreshToken = this.refreshTokenSubject.value;
    if (refreshToken) return refreshToken;

    const localRefreshToken = localStorage.getItem('refreshToken');
    if (localRefreshToken) {
      this.refreshTokenSubject.next(localRefreshToken);
      return localRefreshToken;
    }

    return null;
  }

  login(credentials: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          this.tokenSubject.next(response.data.token);
          this.refreshTokenSubject.next(response.data.refreshToken);
          
          // Trigger WebSocket initialization by dispatching a custom event
          window.dispatchEvent(new CustomEvent('userAuthenticated'));
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  register(userData: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/register`, userData).pipe(
      tap(response => {
        if (response.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          this.tokenSubject.next(response.data.token);
          this.refreshTokenSubject.next(response.data.refreshToken);
          
          // Trigger WebSocket initialization by dispatching a custom event
          window.dispatchEvent(new CustomEvent('userAuthenticated'));
        }
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/refresh`, {
      refreshToken: refreshToken
    }).pipe(
      tap(response => {
        if (response.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          this.tokenSubject.next(response.data.token);
          this.refreshTokenSubject.next(response.data.refreshToken);
        }
      }),
      catchError(error => {
        console.error('Token refresh error:', error);
        this.logout();
        return throwError(() => error);
      })
    );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/forgot-password`, request).pipe(
      catchError(error => {
        console.error('Forgot password error:', error);
        return throwError(() => error);
      })
    );
  }

  resetPassword(request: ResetPasswordRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/reset-password`, request).pipe(
      catchError(error => {
        console.error('Reset password error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.tokenSubject.next(null);
    this.refreshTokenSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    // Check if token is expired
    if (this.isTokenExpired(token)) {
      console.log('Token is expired, logging out...');
      this.logout();
      return false;
    }
    
    return true;
  }

  getCurrentUser(): UserResponse | null {
    const user = localStorage.getItem('user');
    if (!user) return null;
    
    try {
      return JSON.parse(user);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();

      if (currentTime >= expirationTime) {
        console.log('Token expired at:', new Date(expirationTime));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error parsing token:', error);
      return true;
    }
  }

  private checkTokenExpiryAsync(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const token = this.getToken();
        if (!token) {
          resolve(true);
          return;
        }

        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();

        resolve(currentTime >= expirationTime);
      } catch (error) {
        console.error('Error checking token expiry:', error);
        resolve(true);
      }
    });
  }

  shouldRefreshToken(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // Refresh if token expires in less than 5 minutes
      const shouldRefresh = timeUntilExpiry < 5 * 60 * 1000;
      
      if (shouldRefresh) {
        console.log('Token should be refreshed, expires in:', Math.round(timeUntilExpiry / 1000), 'seconds');
      }
      
      return shouldRefresh;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true;
    }
  }
}
