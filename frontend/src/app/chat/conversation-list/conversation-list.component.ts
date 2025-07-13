// conversation-list.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { Conversation } from '../../models/conversation';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConversationCreateComponent } from '../conversation-create/conversation-create.component';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConversationCreateComponent],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss']
})
export class ConversationListComponent implements OnInit {
  private chatService = inject(ChatService);
  conversations: Conversation[] = [];
  searchTerm = '';

  ngOnInit(): void {
    this.chatService.getConversations().subscribe({
      next: convs => this.conversations = convs,
      error: err => console.error('Failed to load conversations', err)
    });
  }

  filteredConversations(): Conversation[] {
    if (!this.searchTerm) return this.conversations;
    return this.conversations.filter(conv =>
      conv.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      conv.participants.some(p =>
        p.user?.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      )
    );
  }

  selectConversation(conversation: Conversation): void {
    this.chatService.setActiveConversation(conversation);
  }

  onConversationCreated(): void {
    this.chatService.getConversations().subscribe({
      next: convs => this.conversations = convs,
      error: err => console.error('Failed to refresh conversations', err)
    });
  }

}
