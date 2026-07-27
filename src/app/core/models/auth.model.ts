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
  /** F11 (S10): true si el usuario ya activó la verificación en dos pasos. */
  twoFactorEnabled?: boolean;
  /** F11 (S10): true si la empresa exige 2FA a todos sus usuarios. */
  companyRequire2fa?: boolean;
}

/** F11 (S10): /auth/login ya no siempre abre sesión — si el usuario tiene 2FA, responde con un pendingToken. */
export interface LoginResponse {
  message: string;
  requires2fa: boolean;
  user?: AuthUser;
  pendingToken?: string;
}

export interface TwoFactorLoginRequest {
  pendingToken: string;
  code: string;
}

export interface TwoFactorSetupResponse {
  message: string;
  otpauthUri: string;
  secret: string;
}

export interface TwoFactorVerifyRequest {
  code: string;
}

export interface TwoFactorVerifyResponse {
  message: string;
  recoveryCodes: string[];
}

export interface TwoFactorDisableRequest {
  password: string;
  code: string;
}

/** Regenerar códigos de recuperación exige la misma prueba que desactivar: contraseña + código vigente. */
export type TwoFactorRecoveryCodesRegenerateRequest = TwoFactorDisableRequest;

export interface TwoFactorRecoveryCodesRegenerateResponse {
  message: string;
  recoveryCodes: string[];
}

/**
 * Delta 2026-07-27: esta solicitud ya NO restablece nada por sí sola — solo
 * notifica al usuario y a los admins con `users.manage-2fa`. Es el admin
 * quien completa el restablecimiento desde la tabla de usuarios (tras
 * verificar identidad fuera de banda), no el propio usuario por correo.
 */
export interface ForgotTwoFactorRequest {
  email: string;
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
  twoFactorEnabled?: boolean;
  companyRequire2fa?: boolean;
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
