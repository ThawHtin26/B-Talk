import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Message } from '../models/message';
import { ApiResponse } from '../models/api-response';
import { AuthService } from './auth.service';
import { ChatStateService } from './chat-state.service';
import { Page } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private chatState = inject(ChatStateService);
  private apiUrl = environment.apiUrl;


  sendMessage(
    conversationId: number,
    content: string,
    attachments: File[] = []
  ): Observable<ApiResponse<Message>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => new Error('User not authenticated'));

    const formData = new FormData();
    const messageData = {
      conversationId: conversationId,
      senderId: userId,
      content: content,
      messageType: attachments.length > 0 ? 'MEDIA' : 'TEXT',
      status: 'SENT',
      sentAt: null,
      messageId: null,
      senderName: null,
      attachments: [],
    };

    const messageBlob = new Blob([JSON.stringify(messageData)], {
      type: 'application/json',
    });
    formData.append('message', messageBlob);

    attachments.forEach((file) => {
      formData.append('attachments', file, file.name);
    });

    return this.http
      .post<ApiResponse<Message>>(`${this.apiUrl}/messages`, formData)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.chatState.notifyNewMessage(response.data);
          }
        }),
        catchError((error) => this.handleError('Failed to send message', error))
      );
  }

  markMessagesAsRead(conversationId: number, userId: number): Observable<ApiResponse<void>> {
    return this.http
      .post<ApiResponse<void>>(
        `${this.apiUrl}/messages/read/conversation/${conversationId}`,
        null,
        { params: { userId: userId.toString() } }
      )
      .pipe(
        catchError((error) => this.handleError('Failed to mark messages as read', error))
      );
  }

  private handleError(message: string, error: any): Observable<never> {
    console.error(message, error);
    return throwError(() => ({ success: false, message, data: null } as ApiResponse<null>));
  }

getMessages(conversationId: number, page: number = 0, size: number = 20): Observable<ApiResponse<Page<Message>>> {
  const userId = this.authService.getCurrentUser()?.userId;
  if (!userId) return throwError(() => new Error('User not authenticated'));

  return this.http
    .get<ApiResponse<Page<Message>>>(`${this.apiUrl}/messages/conversation/${conversationId}/page`, {
      params: {
        userId: userId.toString(),
        page: page.toString(),
        size: size.toString()
      },
    })
    .pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.chatState.updateMessagesState(conversationId, response.data.content);
        }
      }),
      catchError((error) => this.handleError('Failed to load messages', error))
    );
}


getMessagesBefore(conversationId: number, before: Date, page: number = 0, size: number = 20): Observable<ApiResponse<Page<Message>>> {
  const userId = this.authService.getCurrentUser()?.userId;
  if (!userId) return throwError(() => new Error('User not authenticated'));

  return this.http
    .get<ApiResponse<Page<Message>>>(`${this.apiUrl}/messages/conversation/${conversationId}/page/before`, {
      params: {
        userId: userId.toString(),
        before: before.toISOString(),
        page: page.toString(),
        size: size.toString()
      },
    })
    .pipe(
      tap((response) => {
        if (response.success && response.data) {
          console.log("Bla Bla is ",response);
          this.chatState.prependMessages(conversationId, response.data.content);
        }
      }),
      catchError((error) => this.handleError('Failed to load more messages', error))
    );
}
}
