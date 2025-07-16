import { SignalType } from "./call.enum";

export interface CallSignal {
  conversationId: number;
  callId?: string;
  senderId: number;
  recipientId?: number;
  participants?: number[];
  type: SignalType;
  payload: any;
}
