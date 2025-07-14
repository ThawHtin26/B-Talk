import { UserResponse } from "./user-response";

export interface Participant {
  participantId: number;
  userId: number;
  userName:string;
  conversationId: number;
  joinedAt: string;
  leftAt?: string;
}
