import { UserResponse } from "./user-response";

export interface Participant {
  participantId: number;
  userId: number;
  conversationId: number;
  joinedAt: string;
  leftAt?: string;
  user?: UserResponse;
}