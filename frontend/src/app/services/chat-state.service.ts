import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Conversation } from '../models/conversation';
import { Message } from '../models/message';

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  // State subjects
  private _conversations = new BehaviorSubject<Conversation[]>([]);
  private _activeConversation = new BehaviorSubject<Conversation | null>(null);
  private _messages = new BehaviorSubject<{ [key: number]: Message[] }>({});
  private _messageUpdates = new Subject<Message>();
  private _conversationUpdates = new Subject<Conversation>();

  // Public observables
  conversations$ = this._conversations.asObservable();
  activeConversation$ = this._activeConversation.asObservable();
  messages$ = this._messages.asObservable();
  messageUpdates$ = this._messageUpdates.asObservable();
  conversationUpdates$ = this._conversationUpdates.asObservable();

  // State update methods
  setActiveConversation(conversation: Conversation | null): void {
    this._activeConversation.next(conversation);
  }

  updateConversationInLocalState(conversation: Conversation): void {
    const currentConversations = this._conversations.value;
    const existingIndex = currentConversations.findIndex(
      (c) => c.conversationId === conversation.conversationId
    );

    if (existingIndex >= 0) {
      const updated = [...currentConversations];
      updated[existingIndex] = conversation;
      this._conversations.next(updated);
    } else {
      this._conversations.next([...currentConversations, conversation]);
    }

    const currentActive = this._activeConversation.value;
    if (currentActive?.conversationId === conversation.conversationId) {
      this._activeConversation.next(conversation);
    }
  }

  prependMessages(conversationId: number, newMessages: Message[]): void {
    const currentState = this._messages.getValue();
    const currentMessages = currentState[conversationId] || [];

    const existingIds = new Set(currentMessages.map(m => m.messageId));
    const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.messageId));

    this._messages.next({
      ...currentState,
      [conversationId]: [...uniqueNewMessages, ...currentMessages]
    });
  }


  updateMessagesState(conversationId: number, messages: Message[]): void {
    this._messages.next({
      ...this._messages.value,
      [conversationId]: messages,
    });
  }

  notifyNewMessage(message: Message): void {
    this._messageUpdates.next(message);
    this.addMessageToLocalState(message);
  }

  notifyNewConversation(newConv: Conversation): void {
    this.updateConversationInLocalState(newConv);
  }

  private addMessageToLocalState(message: Message): void {
    const current = this._messages.value;
    this._messages.next({
      ...current,
      [message.conversationId]: [
        ...(current[message.conversationId] || []),
        message,
      ],
    });
  }

  updateLastMessageInLocalState(message: Message): void {
    this._conversations.next(
      this._conversations.value.map((conv) =>
        conv.conversationId === message.conversationId
          ? { ...conv, lastMessage: message }
          : conv
      )
    );
  }

  // In chat-state.service.ts
updateConversations(conversations: Conversation[]): void {
  // Merge new conversations with existing ones, preserving any local state
  const currentConversations = this._conversations.value;

  // Create a map of existing conversations for quick lookup
  const existingConversationsMap = new Map<number, Conversation>();
  currentConversations.forEach(conv => {
    existingConversationsMap.set(conv.conversationId, conv);
  });

  // Merge with new conversations, preserving existing conversation objects when possible
  // to maintain reference equality for Angular change detection
  const mergedConversations = conversations.map(newConv => {
    const existingConv = existingConversationsMap.get(newConv.conversationId);
    return existingConv ? {...existingConv, ...newConv} : newConv;
  });

  this._conversations.next(mergedConversations);

  // Update the active conversation if it exists in the new data
  const currentActive = this._activeConversation.value;
  if (currentActive) {
    const updatedActive = mergedConversations.find(
      c => c.conversationId === currentActive.conversationId
    );
    if (updatedActive) {
      this._activeConversation.next(updatedActive);
    }
  }
}
}
