import { CallStatus, CallType } from "./call.enum";

export interface CallRequest {
  callId: string;
  callerId: string | null; // UUID as string
  recipientId?: string; // UUID as string
  conversationId: string; // UUID as string
  status: CallStatus;
  callType: CallType;
}