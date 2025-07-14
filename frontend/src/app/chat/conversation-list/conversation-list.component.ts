import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { Conversation } from '../../models/conversation';
import { FormsModule } from '@angular/forms';
import { ConversationCreateComponent } from '../conversation-create/conversation-create.component';
import { ApiResponse } from '../../models/api-response';
import { Observable, Subscription, map } from 'rxjs';
import { TruncatePipe } from '../../pipes/truncate.pipe';
import { AuthService } from '../../services/auth.service';
import { IsActiveConversationPipe } from '../../pipes/active-conversation.pipe';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [
    TruncatePipe,
    CommonModule,
    FormsModule,
    ConversationCreateComponent,
    IsActiveConversationPipe,
  ],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss'],
})
export class ConversationListComponent implements OnInit, OnDestroy {
  public chatService = inject(ChatService);
  public authService = inject(AuthService);
  private subscriptions = new Subscription();

  searchTerm = '';
  isLoading = false;

  conversations$ = this.chatService.conversations$;

  filteredConversations$: Observable<Conversation[]> = this.conversations$.pipe(
    map((conversations) => {
      if (!this.searchTerm.trim()) return conversations;
      const term = this.searchTerm.toLowerCase();
      return conversations.filter(
        (conv) =>
          conv.name?.toLowerCase().includes(term) ||
          conv.participants.some((p) => p.userName.toLowerCase().includes(term))
      );
    })
  );

  ngOnInit(): void {
    this.loadConversations();

    this.subscriptions.add(
      this.conversations$.subscribe((conversations) => {
        console.log('🔥 Updated conversations in UI:', conversations);
      })
    );

    this.subscriptions.add(
      this.chatService.messageUpdates$.subscribe((message) => {
        if (message) {
          // This will trigger the conversation list to update
          this.chatService.updateLastMessageInLocalState(message);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadConversations(): void {
    this.isLoading = true;
    this.chatService.getConversations().subscribe({
      next: (response: ApiResponse<Conversation[]>) => {
        this.isLoading = false;
        if (!response.success) {
          console.error('Failed to load conversations:', response.message);
        }
      },
      error: (err: Error) => {
        this.isLoading = false;
        console.error('Failed to load conversations', err);
      },
    });
  }

  selectConversation(conversation: Conversation): void {
    this.chatService.setActiveConversation(conversation);
  }

  // Add to your component class
  getConversationAvatar(conv: Conversation): string {
    if (conv.type === 'GROUP') {
      return 'assets/default-avatar.png';
    }
    const otherParticipant = conv.participants.find(
      (p) => p?.userId !== this.authService.getCurrentUser()?.userId
    );
    return 'assets/default-avatar.png';
  }

  getConversationName(conv: Conversation): string {
    if (conv.name) return conv.name;
    const otherParticipant = conv.participants.find(
      (p) => p?.userId !== this.authService.getCurrentUser()?.userId
    );
    return otherParticipant?.userName || 'Unknown user';
  }

  hasUnreadMessages(conv: Conversation): boolean {
    return conv.unreadCount > 0;
  }

  getUnreadCount(conv: Conversation): string {
    if (!conv.unreadCount || conv.unreadCount <= 0) return '';
    return conv.unreadCount > 9 ? '9+' : conv.unreadCount.toString();
  }
}
