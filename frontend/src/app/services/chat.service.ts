import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { Conversation } from '../models/conversation';
import { Message } from '../models/message';
import { ChatStateService } from './chat-state.service';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ChatWebSocketService } from './chat-websocket.service';
import { WebSocketService } from './web-socket.service';

@Injectable({ providedIn: 'root' })
export class ChatService implements OnDestroy {
  private chatState = inject(ChatStateService);
  private conversationService = inject(ConversationService);
  private messageService = inject(MessageService);
  private chatWebSocket = inject(ChatWebSocketService);
  private webSocketService = inject(WebSocketService);

  // Expose observables from state service
  conversations$ = this.chatState.conversations$;
  activeConversation$ = this.chatState.activeConversation$;
  messages$ = this.chatState.messages$;
  messageUpdates$ = this.chatState.messageUpdates$;
  conversationUpdates$ = this.chatState.conversationUpdates$;

  constructor() {
    this.initializeWebSocketListeners();
  }

  private initializeWebSocketListeners(): void {
    this.webSocketService.connected$
      .pipe(
        filter((connected) => connected),
        take(1)
      )
      .subscribe(() => {
        this.chatWebSocket.initializeGlobalConversationUpdates();
      });

    this.activeConversation$.subscribe((conv) => {
      if (conv) {
        this.chatWebSocket.setupRealTimeListeners(conv.conversationId);
      }
    });
  }

  // Delegate methods to appropriate services
  getConversations(): Observable<any> {
    return this.conversationService.getConversations();
  }

  createPrivateConversation(participantId: number): Observable<any> {
    return this.conversationService.createPrivateConversation(participantId);
  }

  createGroupConversation(name: string, participantIds: number[]): Observable<any> {
    return this.conversationService.createGroupConversation(name, participantIds);
  }

  getMessages(conversationId: number): Observable<any> {
    return this.messageService.getMessages(conversationId);
  }

  getMessagesBefore(conversationId: number, before: Date,page:number,size:number): Observable<any>{
    return this.messageService.getMessagesBefore(conversationId,before,page,size);
  }

  sendMessage(conversationId: number, content: string, attachments: File[] = []): Observable<any> {
    return this.messageService.sendMessage(conversationId, content, attachments);
  }

  markMessagesAsRead(conversationId: number, userId: number): Observable<any> {
    return this.messageService.markMessagesAsRead(conversationId, userId);
  }

  setActiveConversation(conversation: Conversation | null): void {
    this.chatState.setActiveConversation(conversation);
    if (conversation) {
      this.getMessages(conversation.conversationId).subscribe();
    }
  }

  ngOnDestroy(): void {
    this.chatWebSocket.ngOnDestroy();
  }
}
