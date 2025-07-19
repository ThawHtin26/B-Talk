import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { CallService } from '../../services/call.service';
import { WebSocketService } from '../../services/web-socket.service';
import { ConversationListComponent } from '../conversation-list/conversation-list.component';
import { MessageListComponent } from '../message-list/message-list.component';
import { MessageInputComponent } from '../message-input/message-input.component';
import { VideoCallComponent } from '../video-call/video-call.component';
import { ConversationCreateComponent } from '../conversation-create/conversation-create.component';
import { CallRequest } from '../../models/call.request';

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
  private authService = inject(AuthService);
  private callService = inject(CallService);
  private webSocketService = inject(WebSocketService);

  private readonly destroy$ = new Subject<void>();
  private subscriptions = new Subscription();

  showVideoCall = false;
  activeConversationId!: string;
  private currentUserId: string | null = null;
  incomingCall: CallRequest | null = null;

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?.userId || null;

    if (!this.currentUserId) {
      console.error('No user ID available');
      return;
    }

    // Ensure WebSocket is initialized
    this.initializeWebSocket();

    this.subscriptions.add(
      this.chatService.getConversations().pipe(
        takeUntil(this.destroy$)
      ).subscribe()
    );

    this.subscriptions.add(
      this.chatService.activeConversation$.pipe(
        filter(conv => conv !== null),
        takeUntil(this.destroy$)
      ).subscribe(conv => {
        if (conv) {
          this.activeConversationId = conv.conversationId;
          this.loadMessages(conv.conversationId);
          // Reset video call state when conversation changes
          this.showVideoCall = false;
        }
      })
    );

    this.subscriptions.add(
      this.callService.getIncomingCall$().pipe(
        takeUntil(this.destroy$)
      ).subscribe(request => {
        if (request) {
          this.incomingCall = request;
          this.showVideoCall = true;
        }
      })
    );
  }

  private initializeWebSocket(): void {
    console.log(' Initializing WebSocket in chat container...');
    this.webSocketService.initializeConnectionIfAuthenticated();
  }

  private loadMessages(conversationId: string): void {
    this.chatService.getMessages(conversationId).subscribe();
  }

  startVideoCall(): void {
    this.showVideoCall = true;
  }

  endVideoCall(): void {
    this.showVideoCall = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }
}
