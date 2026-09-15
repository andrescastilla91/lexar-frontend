import { CatalogRef } from './catalog-backend.model';

export type InvitationStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED';

/** F35: perfil profesional embebido cuando el usuario es asesor legal. */
export interface UserAdvisorProfile {
  specialties: CatalogRef[];
  advisorPhone: string | null;
  professionalCard: string | null;
  mobileSecondary: string | null;
  experienceYears: number;
}

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
  /** F11 (S10): true si el usuario ya activó el segundo factor. */
  twoFactorEnabled: boolean;
  /** F11 delta 2026-07-27: true si hay una solicitud de restablecimiento de 2FA sin resolver. */
  twoFactorResetRequestPending?: boolean;
  roles: RoleBasic[];
  /**
   * F35: unificación de usuarios y asesores — un solo formulario de alta en
   * vez de registrar la persona dos veces (User + Advisor por separado).
   * `isAdvisor` refleja si existe un `Advisor` 1-1 activo para este usuario;
   * `advisorProfile` trae sus datos cuando lo es (`null` si no).
   */
  isAdvisor: boolean;
  advisorProfile: UserAdvisorProfile | null;
}

export interface RoleBasic {
  id: string;
  name: string;
}

/** F35: campos del perfil profesional — comparten forma entre alta y edición. */
export interface AdvisorProfileFields {
  isAdvisor?: boolean;
  specialtyIds?: string[];
  advisorPhone?: string;
  professionalCard?: string;
  mobileSecondary?: string;
  experienceYears?: number;
}

export interface CreateUserRequest extends AdvisorProfileFields {
  firstName: string;
  lastName: string;
  email: string;
}

export interface UpdateUserRequest extends AdvisorProfileFields {
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
