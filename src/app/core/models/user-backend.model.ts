export type InvitationStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED';

export interface UserBackend {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  avatarUrl?: string | null;
  invitationStatus?: InvitationStatus;
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
}
