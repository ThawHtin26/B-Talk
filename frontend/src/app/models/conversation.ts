import { Message } from "./message";
import { Participant } from "./participant";

export interface Conversation {
  conversationId: string; // UUID as string
  type: 'DIRECT' | 'GROUP';
  name?: string;
  creatorId: string; // UUID as string
  createdAt: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
}
