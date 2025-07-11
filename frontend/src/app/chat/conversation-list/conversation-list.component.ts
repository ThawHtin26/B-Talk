import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { Conversation } from '../../models/conversation';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule,FormsModule],
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

  selectConversation(conversation: Conversation): void {
    this.chatService.setActiveConversation(conversation);
  }
}