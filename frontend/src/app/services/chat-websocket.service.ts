import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { filter, takeUntil, take, catchError, retry, delay } from 'rxjs/operators';
import { of } from 'rxjs';
import { WebSocketService } from './web-socket.service';
import { ApiResponse } from '../models/api-response';
import { ConversationUpdatedEvent, NewMessageEvent } from '../models/event.type';
import { ChatStateService } from './chat-state.service';

@Injectable({ providedIn: 'root' })
export class ChatWebSocketService implements OnDestroy {
  private webSocketService = inject(WebSocketService);
  private chatState = inject(ChatStateService);
  private readonly destroy$ = new Subject<void>();
  private subscriptions = new Subscription();

  initializeGlobalConversationUpdates(): void {
    this.webSocketService
      .listenForConversationUpdates()
      .pipe(
        filter(
          (response): response is ApiResponse<ConversationUpdatedEvent> =>
            response.success &&
            (response.data?.eventType === 'NEW_CONVERSATION' || response.data?.eventType === 'CONVERSATION_UPDATED') &&
            !!response.data.conversation
        ),
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Conversation update error:', error);
          // Return empty observable to prevent error propagation
          return of(null);
        }),
        filter(response => response !== null)
      )
      .subscribe({
        next: (response) => {
          if (response && response.data?.conversation) {
            console.log('Received conversation update via WebSocket:', response.data.conversation);
            this.chatState.notifyNewConversation(response.data.conversation);
          }
        },
        error: (err) => console.error('WebSocket error:', err),
      });
  }

  setupRealTimeListeners(conversationId: string): void {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    const convSub = this.webSocketService
      .listenForConversationUpdates()
      .pipe(
        filter(
          (response): response is ApiResponse<ConversationUpdatedEvent> =>
            response.success &&
            (response.data?.eventType === 'NEW_CONVERSATION' || response.data?.eventType === 'CONVERSATION_UPDATED') &&
            !!response.data.conversation
        ),
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Conversation update error:', error);
          return of(null);
        }),
        filter(response => response !== null)
      )
      .subscribe({
        next: (response) => {
          if (response && response.data?.conversation) {
            console.log('Received conversation update via WebSocket:', response.data.conversation);
            this.chatState.notifyNewConversation(response.data.conversation);
            if (response.data.conversation) {
              this.chatState.updateConversationInLocalState(response.data.conversation);
            }
          }
        },
        error: (err) => console.error('Conversation update error:', err),
      });

    this.subscriptions.add(convSub);

    const msgSub = this.webSocketService
      .listenForMessageUpdates(conversationId)
      .pipe(
        filter(
          (response): response is ApiResponse<NewMessageEvent> =>
            response.success &&
            response.data?.eventType === 'NEW_MESSAGE' &&
            !!response.data.message
        ),
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Message update error:', error);
          return of(null);
        }),
        filter(response => response !== null)
      )
      .subscribe({
        next: (response) => {
          if (response && response.data?.message) {
            console.log('Received new message via WebSocket:', response.data.message);
            this.chatState.notifyNewMessage(response.data.message);
          }
        },
        error: (err) => console.error('Message update error:', err),
      });

    this.subscriptions.add(msgSub);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }
}
