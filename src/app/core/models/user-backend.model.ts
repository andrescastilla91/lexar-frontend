export interface UserBackend {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  avatarUrl?: string | null;
  roles: RoleBasic[];
}

export interface RoleBasic {
  id: string;
  name: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // Opcional si autoGeneratePassword es true
  autoGeneratePassword?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface AssignRolesRequest {
  roleIds: string[];
}

export interface ChangePasswordRequest {
  newPassword: string;
}

export interface UsersListResponse {
  message: string;
  users: UserBackend[];
  total: number;
  page: number;
  limit: number;
}

export interface UserResponse {
  message: string;
  user: UserBackend;
}

export interface CreateUserResponse {
  message: string;
  user: UserBackend;
  generatedPassword?: string; // Solo presente si se auto-generó
}
