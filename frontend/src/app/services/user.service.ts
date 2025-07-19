import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { UserResponse } from '../models/user-response';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) { }

  searchUsers(query: string): Observable<ApiResponse<UserResponse[]>> {
    return this.http.get<ApiResponse<UserResponse[]>>(`${this.apiUrl}/search`, {
      params: { query }
    }).pipe(
      catchError(error => this.handleError('Failed to search users', error))
    );
  }

  getUsersByIds(ids: string[]): Observable<ApiResponse<UserResponse[]>> {
    return this.http.get<ApiResponse<UserResponse[]>>(`${this.apiUrl}/batch`, {
      params: { ids: ids.join(',') }
    }).pipe(
      catchError(error => this.handleError('Failed to get users by IDs', error))
    );
  }

  private handleError(message: string, error: any): Observable<never> {
    console.error(message, error);
    return throwError(() => ({
      success: false,
      message: message,
      data: null
    } as ApiResponse<null>));
  }
}
