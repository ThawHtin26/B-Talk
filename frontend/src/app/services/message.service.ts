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
    conversationId: string,
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

  markMessagesAsRead(conversationId: string, userId: string): Observable<ApiResponse<void>> {
    return this.http
      .post<ApiResponse<void>>(
        `${this.apiUrl}/messages/read/conversation/${conversationId}`,
        null,
        { params: { userId: userId } }
      )
      .pipe(
        catchError((error) => this.handleError('Failed to mark messages as read', error))
      );
  }

  private handleError(message: string, error: any): Observable<never> {
    console.error(message, error);
    return throwError(() => ({ success: false, message, data: null } as ApiResponse<null>));
  }

  getMessages(conversationId: string, page: number = 0, size: number = 20): Observable<ApiResponse<Page<Message>>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => new Error('User not authenticated'));

    return this.http
      .get<ApiResponse<Page<Message>>>(`${this.apiUrl}/messages/conversation/${conversationId}/page`, {
        params: {
          userId: userId,
          page: page.toString(),
          size: size.toString()
        },
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            // Convert string dates to Date objects
            const messagesWithDates = response.data.content.map(message => ({
              ...message,
              sentAt: new Date(message.sentAt)
            }));
            this.chatState.updateMessagesState(conversationId, messagesWithDates);
          }
        }),
        catchError((error) => this.handleError('Failed to load messages', error))
      );
  }

  getMessagesBefore(conversationId: string, before: Date, page: number = 0, size: number = 20): Observable<ApiResponse<Page<Message>>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => new Error('User not authenticated'));

    return this.http
      .get<ApiResponse<Page<Message>>>(`${this.apiUrl}/messages/conversation/${conversationId}/page/before`, {
        params: {
          userId: userId,
          before: before.toISOString(),
          page: page.toString(),
          size: size.toString()
        },
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            console.log("Bla Bla is ",response);
            // Convert string dates to Date objects
            const messagesWithDates = response.data.content.map(message => ({
              ...message,
              sentAt: new Date(message.sentAt)
            }));
            this.chatState.prependMessages(conversationId, messagesWithDates);
          }
        }),
        catchError((error) => this.handleError('Failed to load more messages', error))
      );
  }

  // Add method to get messages without pagination
  getConversationMessages(conversationId: string): Observable<ApiResponse<Message[]>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => new Error('User not authenticated'));

    return this.http
      .get<ApiResponse<Message[]>>(`${this.apiUrl}/messages/conversation/${conversationId}`, {
        params: { userId: userId }
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            // Convert string dates to Date objects
            const messagesWithDates = response.data.map(message => ({
              ...message,
              sentAt: new Date(message.sentAt)
            }));
            this.chatState.updateMessagesState(conversationId, messagesWithDates);
          }
        }),
        catchError((error) => this.handleError('Failed to load messages', error))
      );
  }
}
