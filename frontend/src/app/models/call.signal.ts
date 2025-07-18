import { SignalType } from "./call.enum";

export interface CallSignal {
  conversationId?: number;
  callerId: number;
  recipientId?: number; // For private calls
  participants?: number[]; // For group calls
  type: SignalType;
  payload: any; // SDP offer/answer or ICE candidate
  callId?: string; // Add if needed for call tracking
}