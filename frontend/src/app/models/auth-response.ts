import { UserResponse } from './user-response';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserResponse;
}
