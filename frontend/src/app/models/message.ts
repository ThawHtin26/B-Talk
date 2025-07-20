import { Attachment } from "./attachment";

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  CALL = 'CALL'
}

export interface Message {
  messageId?: string | null;  // UUID as string, optional because it's assigned by server
  conversationId: string; // UUID as string
  senderId: string; // UUID as string
  senderName?: string | null;  // Optional, might be added by server
  content: string;
  messageType: MessageType;
  sentAt: Date;     // Will be set by server
  status: 'SENT' | 'DELIVERED' | 'SEEN';
  attachments: Attachment[];
  callDuration?: number; // Duration in seconds for call messages
  callType?: 'AUDIO' | 'VIDEO'; // Type of call for call messages
  callStatus?: 'MISSED' | 'ENDED' | 'REJECTED'; // Status of the call
}
