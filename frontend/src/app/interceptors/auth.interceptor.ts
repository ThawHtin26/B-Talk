import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Check if token is expired before making request
  if (token && authService.shouldRefreshToken()) {
    console.log('Token is expired, logging out...');
    authService.logout();
    return throwError(() => new Error('Token expired'));
  }

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return next(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.log('401 Unauthorized error received');
          
          // Token is expired or invalid
          if (authService.getRefreshToken()) {
            console.log('Attempting to refresh token...');
            return authService.refreshToken().pipe(
              switchMap(response => {
                if (response.success) {
                  console.log('Token refreshed successfully');
                  // Retry the original request with new token
                  const newToken = authService.getToken();
                  const newCloned = req.clone({
                    setHeaders: {
                      Authorization: `Bearer ${newToken}`
                    }
                  });
                  return next(newCloned);
                } else {
                  console.log('Token refresh failed');
                  authService.logout();
                  return throwError(() => error);
                }
              }),
              catchError(refreshError => {
                console.error('Token refresh failed:', refreshError);
                authService.logout();
                return throwError(() => error);
              })
            );
          } else {
            console.log('No refresh token available');
            // No refresh token available
            authService.logout();
            return throwError(() => error);
          }
        }
        return throwError(() => error);
      })
    );
  }

  return next(req);
};
