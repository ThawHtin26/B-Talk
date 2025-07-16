import { CallStatus, CallType } from "./call.enum";

export interface CallRequest {
  callId: string;
  callerId: number;
  recipientId?: number;
  conversationId: number;
  status: CallStatus;
  callType: CallType;
}
