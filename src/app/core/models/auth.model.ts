export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterCompanyRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company: {
    legalName: string;
    taxId: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  email: string;
  roles: string[];
  permissions: string[];
  themePreference?: 'light' | 'dark' | 'system';
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  /** F9: true si esta sesión fue abierta por un platform admin (impersonación). */
  impersonating?: boolean;
  /** F10: true si el usuario ya verificó su correo. */
  emailVerified?: boolean;
  /** true solo para el usuario que registró la empresa — es a quien bloquea emailVerifiedGuard hasta verificar. */
  isOwner?: boolean;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
  company: {
    id: string;
    legalName: string;
  };
}

export interface ProfileResponse {
  email: string;
  roles: string[];
  permissions?: string[];
  themePreference?: 'light' | 'dark' | 'system';
  impersonating?: boolean;
  emailVerified?: boolean;
  isOwner?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
}

export interface MessageResponse {
  message: string;
}

export interface VerifyEmailRequest {
  token: string;
}
