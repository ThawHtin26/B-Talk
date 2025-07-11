import { Attachment } from "./attachment";
import { UserResponse } from "./user-response";

export interface Message {
  messageId: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  sentAt: string;
  attachments: Attachment[];
  sender?: UserResponse;
  status?: 'SENT' | 'DELIVERED' | 'READ';
}