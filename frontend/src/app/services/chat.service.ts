import { ApiResponse } from './../models/api-response';
import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, Subscription, throwError } from 'rxjs';
import { catchError, filter, map, tap, takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Conversation } from '../models/conversation';
import { Message, MessageType } from '../models/message';
import { AuthService } from './auth.service';
import { WebSocketService } from './web-socket.service';
import { Attachment } from '../models/attachment';

interface ConversationUpdatedEvent {
  eventType: 'CONVERSATION_UPDATED';
  conversation: Conversation;
}

interface NewMessageEvent {
  eventType: 'NEW_MESSAGE';
  message: Message;
  conversationId?: number;
}

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private webSocketService = inject(WebSocketService);
  private apiUrl = environment.apiUrl;
  private subscriptions = new Subscription();
  private readonly destroy$ = new Subject<void>();

  // State management
  private _conversations = new BehaviorSubject<Conversation[]>([]);
  private _activeConversation = new BehaviorSubject<Conversation | null>(null);
  private _messages = new BehaviorSubject<{ [key: number]: Message[] }>({});
  private _messageUpdates = new Subject<Message>();
  public _conversationUpdates = new Subject<Conversation>();

  // Public observables
  conversations$ = this._conversations.asObservable();
  activeConversation$ = this._activeConversation.asObservable();
  messages$ = this._messages.asObservable();
  messageUpdates$ = this._messageUpdates.asObservable();
  conversationUpdates$ = this._conversationUpdates.asObservable();

  constructor() {
    // Initialize WebSocket listeners when active conversation is set
    this.activeConversation$.subscribe(conv => {
      if (conv) {
        this.setupRealTimeListeners(conv.conversationId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }

  private setupRealTimeListeners(conversationId: number): void {
    // Clear previous subscriptions
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    // Conversation updates listener
    const convSub = this.webSocketService
      .listenForConversationUpdates()
      .pipe(
        filter(
          (response: ApiResponse<any>): response is ApiResponse<ConversationUpdatedEvent> =>
            response.success &&
            response.data?.eventType === 'CONVERSATION_UPDATED' &&
            !!response.data.conversation
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.updateConversationInLocalState(response.data.conversation);
          this._conversationUpdates.next(response.data.conversation);
        },
        error: (err) => console.error('Conversation update error:', err),
      });

    // Message updates listener
    const msgSub = this.webSocketService
      .listenForMessageUpdates(conversationId)
      .pipe(
        filter(
          (response: ApiResponse<any>): response is ApiResponse<NewMessageEvent> =>
            response.success &&
            response.data?.eventType === 'NEW_MESSAGE' &&
            !!response.data.message
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.notifyNewMessage(response.data.message);
          if (response.data.conversationId) {
            this.updateLastMessageInLocalState(response.data.message);
          }
        },
        error: (err) => console.error('Message update error:', err),
      });

    this.subscriptions.add(convSub);
    this.subscriptions.add(msgSub);
  }

  getMessages(conversationId: number): Observable<ApiResponse<Message[]>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => new Error('User not authenticated'));

    return this.http.get<ApiResponse<Message[]>>(
      `${this.apiUrl}/messages/conversation/${conversationId}`,
      { params: { userId: userId.toString() } }
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.updateMessagesState(conversationId, response.data);
        }
      }),
      catchError(error => this.handleError('Failed to load messages', error))
    );
  }

sendMessage(conversationId: number, content: string, attachments: File[] = []): Observable<ApiResponse<Message>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => new Error('User not authenticated'));

    const formData = new FormData();

    // Create message data
    const messageData = {
        conversationId: conversationId,
        senderId: userId,
        content: content,
        messageType: attachments.length > 0 ? 'MEDIA' : 'TEXT',
        status: 'SENT',
        sentAt: null,
        messageId: null,
        senderName: null,
        attachments: []
    };

    // Append as raw JSON string with correct content type
    const messageBlob = new Blob([JSON.stringify(messageData)], {
        type: 'application/json'
    });
    formData.append('message', messageBlob);

    // Add attachments
    attachments.forEach(file => {
        formData.append('attachments', file, file.name);
    });

    return this.http.post<ApiResponse<Message>>(
        `${this.apiUrl}/messages`,
        formData
    ).pipe(
        tap(response => {
            if (response.success && response.data) {
                this.notifyNewMessage(response.data);
            }
        }),
        catchError(error => this.handleError('Failed to send message', error))
    );
}
  markMessagesAsRead(conversationId: number, userId: number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.apiUrl}/messages/read/conversation/${conversationId}`,
      null,
      { params: { userId: userId.toString() } }
    ).pipe(
      catchError(error => this.handleError('Failed to mark messages as read', error))
    );
  }

  getConversations(): Observable<ApiResponse<Conversation[]>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => this.createAuthError());

    return this.http
      .get<ApiResponse<Conversation[]>>(`${this.apiUrl}/conversations/user/${userId}`)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this._conversations.next(response.data);
          }
        }),
        catchError((error) => this.handleError('Failed to load conversations', error))
      );
  }

  createPrivateConversation(participantId: number): Observable<ApiResponse<Conversation>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => this.createAuthError());

    return this.http.post<ApiResponse<Conversation>>(
      `${this.apiUrl}/conversations/private`,
      null,
      {
        params: {
          creatorId: userId.toString(),
          participantId: participantId.toString()
        }
      }
    );
  }

  createGroupConversation(name: string, participantIds: number[]): Observable<ApiResponse<Conversation>> {
    const userId = this.authService.getCurrentUser()?.userId;
    if (!userId) return throwError(() => this.createAuthError());

    if (!participantIds.includes(userId)) {
      participantIds = [...participantIds, userId];
    }

    return this.http.post<ApiResponse<Conversation>>(
      `${this.apiUrl}/conversations/group`,
      participantIds,
      {
        params: {
          creatorId: userId.toString(),
          name: name
        }
      }
    );
  }

  setActiveConversation(conversation: Conversation | null): void {
    this._activeConversation.next(conversation);
    if (conversation) {
      this.getMessages(conversation.conversationId).subscribe();
    }
  }

  public updateConversationInLocalState(conversation: Conversation): void {
    const currentConversations = this._conversations.value;
    const existingIndex = currentConversations.findIndex(c => c.conversationId === conversation.conversationId);

    if (existingIndex >= 0) {
      const updated = [...currentConversations];
      updated[existingIndex] = conversation;
      this._conversations.next(updated);
    } else {
      this._conversations.next([...currentConversations, conversation]);
    }

    const currentActive = this._activeConversation.value;
    if (currentActive?.conversationId === conversation.conversationId) {
      this._activeConversation.next(conversation);
    }
  }

  private updateMessagesState(conversationId: number, messages: Message[]): void {
    this._messages.next({ ...this._messages.value, [conversationId]: messages });
  }

  private notifyNewMessage(message: Message): void {
    this._messageUpdates.next(message);
    this.addMessageToLocalState(message);
  }

  private addMessageToLocalState(message: Message): void {
    const current = this._messages.value;
    this._messages.next({
      ...current,
      [message.conversationId]: [...(current[message.conversationId] || []), message],
    });
  }

  public updateLastMessageInLocalState(message: Message): void {
    this._conversations.next(
      this._conversations.value.map(conv =>
        conv.conversationId === message.conversationId
          ? { ...conv, lastMessage: message }
          : conv
      )
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
