import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, Subject, Observable, of } from 'rxjs';
import { filter, takeUntil, switchMap, take, catchError } from 'rxjs/operators';

import { ChatService } from '../../services/chat.service';
import { WebSocketService } from '../../services/web-socket.service';
import { AuthService } from '../../services/auth.service';
import { ApiResponse } from '../../models/api-response';
import { ConversationUpdatedEvent, NewMessageEvent } from '../../models/event.type';

import { ConversationListComponent } from '../conversation-list/conversation-list.component';
import { MessageListComponent } from '../message-list/message-list.component';
import { MessageInputComponent } from '../message-input/message-input.component';
import { VideoCallComponent } from '../video-call/video-call.component';
import { ConversationCreateComponent } from '../conversation-create/conversation-create.component';

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [
    CommonModule,
    ConversationListComponent,
    MessageListComponent,
    MessageInputComponent,
    VideoCallComponent,
    ConversationCreateComponent
  ],
  templateUrl: './chat-container.component.html',
  styleUrls: ['./chat-container.component.scss']
})
export class ChatContainerComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private wsService = inject(WebSocketService);
  private authService = inject(AuthService);

  private subscriptions = new Subscription();
  private readonly destroy$ = new Subject<void>();
  private messageSubscription: Subscription | null = null;

  showVideoCall = false;
  activeConversationId: number | null = null;
  private currentUserId: number | null = null;

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.userId ?? null;

    if (!this.currentUserId) {
      console.error('No user ID available');
      return;
    }

    // Initial conversation fetch
    this.subscriptions.add(
      this.chatService.getConversations().subscribe()
    );

    // Setup WebSocket listeners when connection is established
    this.setupRealTimeUpdates();

    // Track active conversation changes
    this.subscriptions.add(
      this.chatService.activeConversation$.pipe(
        filter(conv => conv !== null),
        takeUntil(this.destroy$)
      ).subscribe(conv => {
        this.activeConversationId = conv!.conversationId;
        this.loadMessages(conv!.conversationId);
        this.setupMessageSubscription(conv!.conversationId);
      })
    );
  }

  private setupRealTimeUpdates(): void {
    // Wait for WebSocket connection to be established
    this.subscriptions.add(
      this.wsService.subscribe<ApiResponse<ConversationUpdatedEvent>>('/queue/conversation-updates').pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response) => {
          if (response.success && response.data?.eventType === 'NEW_CONVERSATION') {
            this.chatService.updateConversationInLocalState(response.data.conversation);
          }
        },
        error: (err) => console.error('Conversation update error:', err)
      })
    );
  }

  private setupMessageSubscription(conversationId: number): void {
    // Clean up previous subscription if exists
    this.messageSubscription?.unsubscribe();

    if (!this.currentUserId) return;

    this.messageSubscription = this.wsService.subscribe<ApiResponse<NewMessageEvent>>(
      `/topic/conversation/${conversationId}/messages`
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.success && response.data?.eventType === 'NEW_MESSAGE') {
          // Mark messages as read if they belong to the active conversation
          if (response.data.conversationId === this.activeConversationId) {
            this.chatService.markMessagesAsRead(
              response.data.conversationId!,
              this.currentUserId!
            ).subscribe();
          }
        }
      },
      error: (err) => console.error('Message update error:', err)
    });
  }

  private loadMessages(conversationId: number): void {
    this.subscriptions.add(
      this.chatService.getMessages(conversationId).pipe(
        takeUntil(this.destroy$)
      ).subscribe()
    );
  }

  startVideoCall(): void {
    if (!this.activeConversationId) return;
    this.showVideoCall = true;
  }

  endVideoCall(): void {
    this.showVideoCall = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
    this.messageSubscription?.unsubscribe();
  }
}
