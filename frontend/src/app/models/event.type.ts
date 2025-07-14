import { Conversation } from "./conversation";
import { Message } from "./message";

export interface NewMessageEvent {
  eventType: 'NEW_MESSAGE';
  message: Message;
  conversationId?: number;
}

export interface ConversationUpdatedEvent {
  eventType: 'NEW_CONVERSATION';
  conversation: Conversation;
}
