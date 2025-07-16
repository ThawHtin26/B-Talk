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

  private readonly destroy$ = new Subject<void>();
  private subscriptions = new Subscription();

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

    // Track active conversation changes
    this.subscriptions.add(
      this.chatService.activeConversation$.pipe(
        filter(conv => conv !== null),
        takeUntil(this.destroy$)
      ).subscribe(conv => {
        this.activeConversationId = conv!.conversationId;
        this.loadMessages(conv!.conversationId);
      })
    );
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
  }
}
