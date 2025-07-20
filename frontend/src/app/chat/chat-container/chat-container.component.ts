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
  
  // Video call parameters
  videoCallConversationId?: string;
  videoCallRecipientId?: string;
  isInitiatingVideoCall = false;

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
          this.endVideoCall();
        }
      })
    );

    // Handle incoming calls (for receiver)
    this.subscriptions.add(
      this.callService.getIncomingCall$().pipe(
        takeUntil(this.destroy$)
      ).subscribe(request => {
        if (request) {
          console.log('[ChatContainer] RECEIVER: Incoming call received:', request);
          this.incomingCall = request;
          this.videoCallConversationId = request.conversationId;
          this.videoCallRecipientId = request.callerId || undefined;
          this.isInitiatingVideoCall = false;
          this.showVideoCall = true;
          console.log('[ChatContainer] RECEIVER: Video call component should now be visible');
        }
      })
    );

    // Handle call initiated confirmations (for caller)
    this.subscriptions.add(
      this.callService.getCallInitiated$().pipe(
        takeUntil(this.destroy$)
      ).subscribe(request => {
        if (request) {
          console.log('[ChatContainer] CALLER: Call initiated confirmation received:', request);
          this.incomingCall = request;
          this.videoCallConversationId = request.conversationId;
          this.videoCallRecipientId = request.recipientId || undefined;
          this.isInitiatingVideoCall = true;
          this.showVideoCall = true;
          console.log('[ChatContainer] CALLER: Video call component should now be visible for caller');
        }
      })
    );

    // Handle call ended events
    this.subscriptions.add(
      this.callService.getCallEnded$().pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        console.log('[ChatContainer] Call ended, cleaning up video call component');
        this.endVideoCall();
      })
    );
  }

  private initializeWebSocket(): void {
    console.log('Initializing WebSocket in chat container...');
    this.webSocketService.initializeConnectionIfAuthenticated();
  }

  private loadMessages(conversationId: string): void {
    this.chatService.getMessages(conversationId).subscribe();
  }

  startVideoCall(): void {
    console.log('[ChatContainer] Starting video call...');
    // Get the active conversation to determine recipient
    this.chatService.activeConversation$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(conversation => {
      if (conversation) {
        console.log('[ChatContainer] Active conversation:', conversation);
        // For private conversations, find the other participant
        if (conversation.type === 'PRIVATE' && conversation.participants) {
          const currentUser = this.authService.getCurrentUser();
          const otherParticipant = conversation.participants.find(
            p => p.userId !== currentUser?.userId
          );
          
          if (otherParticipant) {
            console.log('[ChatContainer] Starting video call with participant:', otherParticipant);
            this.videoCallConversationId = conversation.conversationId;
            this.videoCallRecipientId = otherParticipant.userId;
            this.isInitiatingVideoCall = true;
            this.showVideoCall = true;
          } else {
            console.error('[ChatContainer] Could not find other participant for video call');
          }
        } else {
          // For group calls, we'll need to implement group call logic
          console.log('[ChatContainer] Group video calls not yet implemented');
        }
      }
    });
  }

  endVideoCall(): void {
    console.log('[ChatContainer] Ending video call...');
    this.showVideoCall = false;
    this.isInitiatingVideoCall = false;
    this.videoCallConversationId = undefined;
    this.videoCallRecipientId = undefined;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }
}
