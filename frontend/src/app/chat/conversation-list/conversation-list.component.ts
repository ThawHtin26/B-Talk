import { Component, inject, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
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
import { ChatStateService } from '../../services/chat-state.service';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [
    TruncatePipe,
    CommonModule,
    FormsModule,
    ConversationCreateComponent,
    IsActiveConversationPipe,
    NotificationBellComponent,
  ],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss'],
})
export class ConversationListComponent implements OnInit, OnDestroy {
  public chatService = inject(ChatService);
  public authService = inject(AuthService);
  private chatSateService = inject(ChatStateService);
  private router = inject(Router);
  private subscriptions = new Subscription();

  @Output() conversationSelected = new EventEmitter<void>();

  searchTerm = '';
  isLoading = false;

  conversations$ = this.chatService.conversations$;

  filteredConversations$: Observable<Conversation[]> = this.conversations$.pipe(
    map((conversations) => {
      // Filter out null/undefined conversations first
      const validConversations = conversations.filter(conv => conv != null);
      
      if (!this.searchTerm.trim()) return validConversations;
      const term = this.searchTerm.toLowerCase();
      return validConversations.filter(
        (conv) =>
          conv.name?.toLowerCase().includes(term) ||
          (conv.participants && Array.isArray(conv.participants) && 
           conv.participants.some((p) => p?.userName?.toLowerCase().includes(term)))
      );
    })
  );

  ngOnInit(): void {
    this.loadConversations();

    this.subscriptions.add(
      this.chatService.messageUpdates$.subscribe((message) => {
        if (message) {
          // This will trigger the conversation list to update
          this.chatSateService.updateLastMessageInLocalState(message);
        }
      })
    );

    // Subscribe to conversation updates for real-time updates
    this.subscriptions.add(
      this.chatService.conversationUpdates$.subscribe((conversation) => {
        if (conversation) {
          // The conversation list will automatically update through the observable
          console.log('New conversation received:', conversation);
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
    if (!conversation) {
      return;
    }
    this.chatService.setActiveConversation(conversation);
    this.conversationSelected.emit();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getConversationAvatar(conv: Conversation): string {
    if (!conv) {
      return 'assets/default-avatar.png';
    }
    
    if (conv.type === 'GROUP') {
      return 'assets/default-avatar.png';
    }
    
    const currentUserId = this.authService.getCurrentUser()?.userId;
    if (!conv.participants || !Array.isArray(conv.participants)) {
      return 'assets/default-avatar.png';
    }
    
    const otherParticipant = conv.participants.find(
      (p) => p.userId !== currentUserId
    );
    return 'assets/default-avatar.png';
  }

  getConversationName(conv: Conversation): string {
    if (!conv) {
      return 'Unknown user';
    }
    
    // For group conversations, use the conversation name
    if (conv.type === 'GROUP' && conv.name) {
      return conv.name;
    }
    
    // For private conversations, show the other participant's name
    const currentUserId = this.authService.getCurrentUser()?.userId;
    if (!conv.participants || !Array.isArray(conv.participants)) {
      return 'Unknown user';
    }
    
    const otherParticipant = conv.participants.find(
      (p) => p?.userId !== currentUserId
    );
    
    if (otherParticipant) {
      return otherParticipant.userName || 'Unknown user';
    }
    
    return 'Unknown user';
  }

  hasUnreadMessages(conv: Conversation): boolean {
    if (!conv) return false;
    return conv.unreadCount > 0;
  }

  getUnreadCount(conv: Conversation): string {
    if (!conv || !conv.unreadCount || conv.unreadCount <= 0) return '';
    return conv.unreadCount > 9 ? '9+' : conv.unreadCount.toString();
  }

  getCurrentUserId(): string {
    return this.authService.getCurrentUser()?.userId || '';
  }

  startVideoCall(conversation: Conversation): void {
    console.log('Starting video call for conversation:', conversation);
    
    // Find the other participant for private conversations
    if (conversation.type === 'PRIVATE' && conversation.participants) {
      const currentUser = this.authService.getCurrentUser();
      const otherParticipant = conversation.participants.find(
        p => p.userId !== currentUser?.userId
      );
      
      if (otherParticipant) {
        // Emit an event or call a service to start video call
        console.log('Initiating video call with:', otherParticipant);
        // You can implement the actual video call logic here
        // For now, we'll just log the action
      } else {
        console.error('Could not find other participant for video call');
      }
    } else {
      console.log('Video calls are only available for private conversations');
    }
  }
}
