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
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}
