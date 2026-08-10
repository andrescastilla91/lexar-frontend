export interface ProfileUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  phone: string | null;
  themePreference: 'light' | 'dark' | 'system';
  avatarUrl: string | null;
  roles: { id: string; name: string }[];
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  themePreference?: 'light' | 'dark' | 'system';
}

export interface ChangeMyPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  current: boolean;
}

export interface SignedUrlResponse {
  url: string;
  key: string;
  bucket: string;
  expiresIn: number;
}
