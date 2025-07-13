import { Message } from "@stomp/stompjs";
import { Conversation } from "./conversation";

export interface NewMessageEvent {
  eventType: 'NEW_MESSAGE';
  message: Message;
  conversationId?: number;
}

export interface ConversationUpdatedEvent {
  eventType: 'CONVERSATION_UPDATED';
  conversation: Conversation;
}
