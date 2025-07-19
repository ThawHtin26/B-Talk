import { SignalType } from "./call.enum";

export interface CallSignal {
  conversationId?: string; // UUID as string
  callerId: string; // UUID as string
  recipientId?: string; // UUID as string, for private calls
  participants?: string[]; // UUIDs as strings, for group calls
  type: SignalType;
  payload: any; // SDP offer/answer or ICE candidate
  callId?: string; // Add if needed for call tracking
}