import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Conversation } from '../models/conversation';
import { ApiResponse } from '../models/api-response';
import { AuthService } from './auth.service';
import { ChatStateService } from './chat-state.service';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private chatState = inject(ChatStateService);
  private apiUrl = environment.apiUrl;

  getConversations(): Observable<ApiResponse<Conversation[]>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => this.createAuthError());

    return this.http
      .get<ApiResponse<Conversation[]>>(`${this.apiUrl}/conversations/user/${userId}`)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.chatState.updateConversations(response.data);
          }
        }),
        catchError((error) => this.handleError('Failed to load conversations', error))
      );
  }

  createPrivateConversation(participantId: number): Observable<ApiResponse<Conversation>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => this.createAuthError());

    return this.http
      .post<ApiResponse<Conversation>>(`${this.apiUrl}/conversations/private`, null, {
        params: {
          creatorId: userId.toString(),
          participantId: participantId.toString(),
        },
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.chatState.notifyNewConversation(response.data);
          }
        }),
        catchError((error) => this.handleError('Failed to create private conversation', error))
      );
  }

  createGroupConversation(name: string, participantIds: number[]): Observable<ApiResponse<Conversation>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => this.createAuthError());

    if (!participantIds.includes(userId)) {
      participantIds = [...participantIds, userId];
    }

    return this.http
      .post<ApiResponse<Conversation>>(`${this.apiUrl}/conversations/group`, participantIds, {
        params: {
          creatorId: userId.toString(),
          name: name,
        },
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.chatState.notifyNewConversation(response.data);
          }
        }),
        catchError((error) => this.handleError('Failed to create group conversation', error))
      );
  }

  private createAuthError(): ApiResponse<null> {
    return { success: false, message: 'User not authenticated', data: null };
  }

  private handleError(message: string, error: any): Observable<never> {
    console.error(message, error);
    return throwError(() => ({ success: false, message, data: null } as ApiResponse<null>));
  }
}
