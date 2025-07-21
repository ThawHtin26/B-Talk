import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
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
import { CallType, CallStatus } from '../../models/call.enum';
import { Conversation } from '../../models/conversation';

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
  public chatService = inject(ChatService);
  private authService = inject(AuthService);
  private callService = inject(CallService);
  private webSocketService = inject(WebSocketService);

  private readonly destroy$ = new Subject<void>();
  private subscriptions = new Subscription();

  showVideoCall = false;
  activeConversationId!: string;
  private currentUserId: string | null = null;
  incomingCall: CallRequest | null = null;
  private activeConversation: Conversation | null = null;
  
  // Mobile view state management
  currentView: 'conversations' | 'messages' = 'conversations';
  private isDesktop = false;
  
  // Video call parameters
  videoCallConversationId?: string;
  videoCallRecipientId?: string;
  isInitiatingVideoCall = false;

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updateDesktopView();
  }

  ngOnInit(): void {
    this.updateDesktopView();
    
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
        takeUntil(this.destroy$)
      ).subscribe(conv => {
        this.activeConversation = conv;
        if (conv) {
          this.activeConversationId = conv.conversationId;
          this.loadMessages(conv.conversationId);
          // Switch to messages view when conversation is selected on mobile
          if (!this.isDesktop) {
            this.currentView = 'messages';
          }
          // Only reset video call state if no active call is ongoing
          if (!this.callService.isCallActive()) {
            this.endVideoCall();
          }
        }
      })
    );

    // Check for existing call state on initialization
    const existingCall = this.callService.getCurrentCallState();
    if (existingCall) {
      console.log('[ChatContainer] Found existing call state:', existingCall);
      this.incomingCall = existingCall;
      this.videoCallConversationId = existingCall.conversationId;
      this.videoCallRecipientId = existingCall.recipientId || undefined;
      this.isInitiatingVideoCall = false;
      this.showVideoCall = true;
    }

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

  private updateDesktopView(): void {
    this.isDesktop = window.innerWidth >= 1024; // lg breakpoint
    if (this.isDesktop) {
      this.currentView = 'messages'; // Always show messages view on desktop
    }
  }

  // Mobile view navigation methods
  showConversations(): void {
    if (!this.isDesktop) {
      this.currentView = 'conversations';
    }
  }

  showMessages(): void {
    this.currentView = 'messages';
  }

  // Helper methods for template
  isDesktopView(): boolean {
    return this.isDesktop;
  }

  hasActiveConversation(): boolean {
    return !!this.activeConversationId;
  }

  getActiveConversationName(): string {
    if (!this.activeConversation) return 'Chat';
    
    if (this.activeConversation.type === 'GROUP' && this.activeConversation.name) {
      return this.activeConversation.name;
    }
    
    // For private conversations, show the other participant's name
    const currentUserId = this.authService.getCurrentUser()?.userId;
    if (this.activeConversation.participants && Array.isArray(this.activeConversation.participants)) {
      const otherParticipant = this.activeConversation.participants.find(
        (p: any) => p?.userId !== currentUserId
      );
      
      if (otherParticipant) {
        return otherParticipant.userName || 'Unknown user';
      }
    }
    
    return 'Chat';
  }

  canStartVideoCall(): boolean {
    return (this.activeConversation as Conversation)?.type === 'PRIVATE' && !this.showVideoCall;
  }

  private initializeWebSocket(): void {
    console.log('Initializing WebSocket in chat container...');
    this.webSocketService.initializeConnectionIfAuthenticated();
  }

  private loadMessages(conversationId: string): void {
    this.chatService.getMessages(conversationId).subscribe();
  }

  startVideoCall(): void {
    console.log('[ChatContainer] startVideoCall() method called');
    console.log('[ChatContainer] Starting video call...');
    
    // Get the active conversation to determine recipient
    this.chatService.activeConversation$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(conversation => {
      console.log('[ChatContainer] Active conversation:', conversation);
      
      if (conversation) {
        console.log('[ChatContainer] Active conversation:', conversation);
        // For private conversations, find the other participant
        if (conversation.type === 'PRIVATE' && conversation.participants) {
          const currentUser = this.authService.getCurrentUser();
          console.log('[ChatContainer] Current user:', currentUser);
          console.log('[ChatContainer] Conversation participants:', conversation.participants);
          
          const otherParticipant = conversation.participants.find(
            p => p.userId !== currentUser?.userId
          );
          
          if (otherParticipant) {
            console.log('[ChatContainer] Starting video call with participant:', otherParticipant);
            this.videoCallConversationId = conversation.conversationId;
            this.videoCallRecipientId = otherParticipant.userId;
            this.isInitiatingVideoCall = true;
            this.showVideoCall = true;
            
            // Create call request
            const callRequest: CallRequest = {
              conversationId: conversation.conversationId,
              callerId: currentUser?.userId || '',
              recipientId: otherParticipant.userId,
              callType: CallType.PRIVATE,
              status: CallStatus.RINGING,
              callId: this.generateCallId()
            };
            
            console.log('[ChatContainer] Call request created:', callRequest);
            console.log('[ChatContainer] Calling callService.initiateCall()');
            
            // Initiate the call through the service
            this.callService.initiateCall(callRequest);
            
            console.log('[ChatContainer] Call initiation request sent');
          } else {
            console.error('[ChatContainer] Could not find other participant for video call');
          }
        } else {
          // For group calls, we'll need to implement group call logic
          console.log('[ChatContainer] Group video calls not yet implemented');
        }
      } else {
        console.error('[ChatContainer] No active conversation found');
      }
    });
  }

  private generateCallId(): string {
    return 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
