import { Attachment } from "./attachment";

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO'
}

export interface Message {
  messageId?: number | null;  // Optional because it's assigned by server
  conversationId: number;
  senderId: number;
  senderName?: string | null;  // Optional, might be added by server
  content: string;
  messageType: MessageType;
  sentAt: string;     // Will be set by server
  status: 'SENT' | 'DELIVERED' | 'SEEN';
  attachments: Attachment[];
}
