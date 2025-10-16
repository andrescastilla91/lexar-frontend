export type UserRole = 'admin' | 'advisor' | 'assistant';

export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}
