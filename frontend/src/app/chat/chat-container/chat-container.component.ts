import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { WebSocketService } from '../../services/web-socket.service';
import { AuthService } from '../../services/auth.service';
import { ConversationListComponent } from '../conversation-list/conversation-list.component';
import { MessageListComponent } from '../message-list/message-list.component';
import { MessageInputComponent } from '../message-input/message-input.component';
import { VideoCallComponent } from '../video-call/video-call.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [
    CommonModule,
    ConversationListComponent,
    MessageListComponent,
    MessageInputComponent,
    VideoCallComponent
  ],
  templateUrl: './chat-container.component.html',
  styleUrls: ['./chat-container.component.scss']
})
export class ChatContainerComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private wsService = inject(WebSocketService);
  private authService = inject(AuthService);
  private subscriptions = new Subscription();
  showVideoCall = false;

  ngOnInit(): void {
    this.subscriptions.add(
      this.wsService.onMessage().subscribe(message => {
        // Handle incoming messages
      })
    );

    this.subscriptions.add(
      this.wsService.onCall().subscribe(call => {
        this.showVideoCall = true;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.wsService.disconnect();
  }

  startVideoCall(): void {
    this.chatService.activeConversation$.subscribe(conv => {
      if (conv) {
        this.chatService.startVideoCall(conv.conversationId).subscribe({
          next: () => this.showVideoCall = true,
          error: err => console.error('Call failed', err)
        });
      }
    });
  }

  endVideoCall(): void {
    this.showVideoCall = false;
  }
}