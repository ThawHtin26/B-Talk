import { UserResponse } from './user-response';

export interface AuthResponse {
  token: string;
  user: UserResponse;
}
