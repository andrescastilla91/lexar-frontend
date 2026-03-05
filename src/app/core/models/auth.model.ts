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
    address?: string;
    email: string;
    legalRepresentative?: string;
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
}
