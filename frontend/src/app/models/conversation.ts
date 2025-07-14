import { Message } from "./message";
import { Participant } from "./participant";

export interface Conversation {
  conversationId: number;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  creatorId: number;
  createdAt: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
}
