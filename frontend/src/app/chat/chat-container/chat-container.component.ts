import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ConversationListComponent } from '../conversation-list/conversation-list.component';
import { MessageListComponent } from '../message-list/message-list.component';
import { MessageInputComponent } from '../message-input/message-input.component';
import { VideoCallComponent } from '../video-call/video-call.component';
import { ConversationCreateComponent } from '../conversation-create/conversation-create.component';
import { CallService } from '../../services/call.service';
import { CallStatus, CallType } from '../../models/call.enum';
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

  private readonly destroy$ = new Subject<void>();
  private subscriptions = new Subscription();

  showVideoCall = false;
  activeConversationId: number | null = null;
  private currentUserId: number | null = null;
  incomingCall: CallRequest | null = null;

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.userId ?? null;

    if (!this.currentUserId) {
      console.error('No user ID available');
      return;
    }

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
        this.activeConversationId = conv!.conversationId;
        this.loadMessages(conv!.conversationId);
      })
    );

    this.subscriptions.add(
      this.callService.getIncomingCall$().pipe(
        takeUntil(this.destroy$)
      ).subscribe(request => {
        this.incomingCall = request;
        this.showVideoCall = true;
      })
    );
  }

  startVideoCall(): void {
    if (!this.activeConversationId || !this.currentUserId) return;

    const callId = this.generateCallId();
    const request: CallRequest = {
      callId,
      callerId: this.currentUserId,
      conversationId: this.activeConversationId,
      callType: CallType.PRIVATE,
      status: CallStatus.RINGING
    };

    this.callService.initiateCall(request);
    this.showVideoCall = true;
  }

  private generateCallId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private loadMessages(conversationId: number): void {
    this.subscriptions.add(
      this.chatService.getMessages(conversationId).pipe(
        takeUntil(this.destroy$)
      ).subscribe()
    );
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
