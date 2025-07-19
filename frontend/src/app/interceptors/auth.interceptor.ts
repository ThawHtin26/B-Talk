import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Check if token is expired before making the request
    if (this.authService.isAuthenticated()) {
      const token = this.authService.getToken();
      if (token && this.authService.shouldRefreshToken()) {
        console.log('Token is expired, logging out...');
        this.authService.logout();
        return throwError(() => new Error('Token expired'));
      }
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.log('401 Unauthorized error received');
          
          if (this.isRefreshing) {
            return this.refreshTokenSubject.pipe(
              filter(token => token !== null),
              take(1),
              switchMap(() => next.handle(this.addToken(request, this.authService.getToken())))
            );
          } else {
            this.isRefreshing = true;
            this.refreshTokenSubject.next(null);

            return this.authService.refreshToken().pipe(
              switchMap((response: any) => {
                this.isRefreshing = false;
                this.refreshTokenSubject.next(response.data.token);
                console.log('Token refreshed successfully');
                return next.handle(this.addToken(request, response.data.token));
              }),
              catchError((refreshError) => {
                this.isRefreshing = false;
                console.log('Token refresh failed');
                this.authService.logout();
                return throwError(() => refreshError);
              })
            );
          }
        } else if (error.status === 403) {
          console.log('Token refresh failed');
          this.authService.logout();
        } else {
          console.error('Token refresh failed:', error);
        }
        
        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string | null): HttpRequest<any> {
    if (!token) {
      console.log('No refresh token available');
      return request;
    }
    
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}
