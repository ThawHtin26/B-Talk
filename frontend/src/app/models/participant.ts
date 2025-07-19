import { UserResponse } from "./user-response";

export interface Participant {
  participantId: string; // UUID as string
  userId: string; // UUID as string
  userName: string;
  userEmail: string; // Changed from userPhone to userEmail
  conversationId: string; // UUID as string
  joinedAt: string;
  leftAt?: string;
}
