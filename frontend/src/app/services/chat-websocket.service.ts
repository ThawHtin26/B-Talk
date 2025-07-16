import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { filter, takeUntil, take } from 'rxjs/operators';
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
            response.data?.eventType === 'NEW_CONVERSATION' &&
            !!response.data.conversation
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.chatState.notifyNewConversation(response.data.conversation);
        },
        error: (err) => console.error('WebSocket error:', err),
      });
  }

  setupRealTimeListeners(conversationId: number): void {
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    const convSub = this.webSocketService
      .listenForConversationUpdates()
      .pipe(
        filter(
          (response): response is ApiResponse<ConversationUpdatedEvent> =>
            response.success &&
            response.data?.eventType === 'NEW_CONVERSATION' &&
            !!response.data.conversation
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.chatState.notifyNewConversation(response.data.conversation);
          if (response.data.conversation) {
            this.chatState.updateConversationInLocalState(response.data.conversation);
          }
        },
        error: (err) => console.error('Conversation update error:', err),
      });

    const msgSub = this.webSocketService
      .listenForMessageUpdates(conversationId)
      .pipe(
        filter(
          (response): response is ApiResponse<NewMessageEvent> =>
            response.success &&
            response.data?.eventType === 'NEW_MESSAGE' &&
            !!response.data.message
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.chatState.notifyNewMessage(response.data.message);
          if (response.data.conversationId) {
            this.chatState.updateLastMessageInLocalState(response.data.message);
          }
        },
        error: (err) => console.error('Message update error:', err),
      });

    this.subscriptions.add(convSub);
    this.subscriptions.add(msgSub);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }
}
