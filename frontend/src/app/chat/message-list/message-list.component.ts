import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { AttachmentPreviewComponent } from '../attachment-preview/attachment-preview.component';
import { Conversation } from '../../models/conversation';
import { Message } from '../../models/message';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule, AttachmentPreviewComponent],
  templateUrl: './message-list.component.html',
  styleUrls: ['./message-list.component.scss']
})
export class MessageListComponent implements OnInit {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  messages: Message[] = [];
  activeConversation: Conversation | null = null;

  ngOnInit(): void {
    this.chatService.activeConversation$.subscribe(conv => {
      this.activeConversation = conv;
      if (conv) {
        this.chatService.getMessages(conv.conversationId).subscribe({
          next: msgs => this.messages = msgs,
          error: err => console.error('Failed to load messages', err)
        });
      }
    });
  }

  isMyMessage(senderId: number): boolean {
    return senderId === this.authService.getCurrentUser()?.userId;
  }
}