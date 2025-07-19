export interface UserResponse {
  userId: string; // UUID as string
  email: string;
  name: string;
  profilePhotoUrl?: string;
  createdAt: string;
}
