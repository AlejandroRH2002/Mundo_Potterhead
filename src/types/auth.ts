export type UserRole = 'admin' | 'user';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
}
