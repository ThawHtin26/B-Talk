import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Conversation } from '../models/conversation';
import { Message } from '../models/message';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  private authService = inject(AuthService);
  
  // State subjects
  private _conversations = new BehaviorSubject<Conversation[]>([]);
  private _activeConversation = new BehaviorSubject<Conversation | null>(null);
  private _messages = new BehaviorSubject<{ [key: string]: Message[] }>({});
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

  prependMessages(conversationId: string, newMessages: Message[]): void {
    const currentState = this._messages.getValue();
    const currentMessages = currentState[conversationId] || [];

    // Ensure all messages have proper Date objects for sentAt
    const messagesWithDates = newMessages.map(message => ({
      ...message,
      sentAt: new Date(message.sentAt)
    }));

    const existingIds = new Set(currentMessages.map(m => m.messageId));
    const uniqueNewMessages = messagesWithDates.filter(m => !existingIds.has(m.messageId));

    this._messages.next({
      ...currentState,
      [conversationId]: [...uniqueNewMessages, ...currentMessages]
    });
  }

  updateMessagesState(conversationId: string, messages: Message[]): void {
    // Ensure all messages have proper Date objects for sentAt
    const messagesWithDates = messages.map(message => ({
      ...message,
      sentAt: new Date(message.sentAt)
    }));
    
    this._messages.next({
      ...this._messages.value,
      [conversationId]: messagesWithDates,
    });
  }

  notifyNewMessage(message: Message): void {
    // Ensure sentAt is a Date object
    const messageWithDate = {
      ...message,
      sentAt: new Date(message.sentAt)
    };
    
    this._messageUpdates.next(messageWithDate);
    this.addMessageToLocalState(messageWithDate);
  }

  notifyNewConversation(conversation: Conversation): void {
    const currentConversations = this._conversations.value;
    
    // Check if conversation already exists
    const existingIndex = currentConversations.findIndex(
      c => c.conversationId === conversation.conversationId
    );
    
    if (existingIndex >= 0) {
      // Update existing conversation
      const updated = [...currentConversations];
      updated[existingIndex] = { ...updated[existingIndex], ...conversation };
      this._conversations.next(updated);
      console.log('Updated existing conversation:', conversation.conversationId);
    } else {
      // Add new conversation at the beginning and ensure it's immediately visible
      const newConversations = [conversation, ...currentConversations];
      this._conversations.next(newConversations);
      console.log('Added new conversation:', conversation.conversationId);
      
      // Also set as active conversation if this is the current user's conversation
      const currentUser = this.authService?.getCurrentUser();
      if (currentUser && conversation.participants?.some(p => p.userId === currentUser.userId)) {
        this._activeConversation.next(conversation);
        console.log('Set as active conversation:', conversation.conversationId);
      }
    }
    
    // Emit conversation update
    this._conversationUpdates.next(conversation);
    
    console.log('New conversation added to state:', conversation.conversationId);
  }

  private addMessageToLocalState(message: Message): void {
    // Ensure sentAt is a Date object
    const messageWithDate = {
      ...message,
      sentAt: new Date(message.sentAt)
    };
    
    const current = this._messages.value;
    this._messages.next({
      ...current,
      [messageWithDate.conversationId]: [
        ...(current[messageWithDate.conversationId] || []),
        messageWithDate,
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
    const existingConversationsMap = new Map<string, Conversation>();
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
