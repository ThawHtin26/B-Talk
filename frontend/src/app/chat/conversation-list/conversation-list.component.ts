import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { Conversation } from '../../models/conversation';
import { FormsModule } from '@angular/forms';
import { ConversationCreateComponent } from '../conversation-create/conversation-create.component';
import { ApiResponse } from '../../models/api-response';
import { Observable, Subscription, map } from 'rxjs';
import { TruncatePipe } from '../../pipes/truncate.pipe';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [
    TruncatePipe,
    CommonModule,
    FormsModule,
    ConversationCreateComponent,
  ],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss'],
})
export class ConversationListComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
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
          conv.participants.some((p) =>
            p.user?.name.toLowerCase().includes(term)
          )
      );
    })
  );

  ngOnInit(): void {
    this.loadConversations();

    this.subscriptions.add(
      this.chatService.conversations$.subscribe((conv) => {
        console.log('Conversations updated:', conv);
      })
    );

    this.subscriptions.add(
    this.chatService.messageUpdates$.subscribe(message => {
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

  onConversationCreated(): void {
    this.loadConversations();
  }
}
