import { PlanFeatures } from './subscription-backend.model';

export interface PlatformAdminUser {
  email: string;
}

/**
 * F11 (S10): el 2FA es obligatorio sin excepción para platform admins — el
 * login nunca abre sesión por sí solo, siempre devuelve un pendingToken que
 * hay que resolver con /2fa/setup+/2fa/verify (primera vez) o /login/2fa
 * (ya enrolado).
 */
export interface PlatformLoginOutcome {
  requiresSetup: boolean;
  requires2fa: boolean;
  pendingToken: string;
}

export interface PlatformTwoFactorSetupResponse {
  otpauthUri: string;
  secret: string;
}

export interface PlatformTwoFactorVerifySetupResponse {
  user: PlatformAdminUser;
  recoveryCodes: string[];
}

export interface TenantSummary {
  id: string;
  legalName: string;
  taxId: string;
  planCode: string;
  planName: string;
  subscriptionStatus: string;
  currentPeriodEnd: string;
  userCount: number;
  storageMb: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface TenantDetail extends TenantSummary {
  activeProcesses: number;
  limits: {
    maxUsers: number | null;
    maxActiveProcesses: number | null;
    maxStorageMb: number | null;
  };
  cancelAtPeriodEnd: boolean;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  }>;
}

export type AdminSubscriptionAction = 'change_plan' | 'extend_trial' | 'suspend' | 'reactivate';

export interface UpdateTenantSubscriptionRequest {
  action: AdminSubscriptionAction;
  planCode?: string;
  days?: number;
}

// F7-R1: PlanFeaturesAdmin se consolidó con PlanFeatures (subscription-backend.model.ts)
// para que el backoffice de planes (F9) y el catálogo público no puedan divergir en shape.
export type PlanFeaturesAdmin = PlanFeatures;

export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxUsers: number | null;
  maxActiveProcesses: number | null;
  maxStorageMb: number | null;
  aiCreditsMonth: number;
  portalClientsMax: number | null;
  features: PlanFeaturesAdmin;
  isActive: boolean;
  sortOrder: number;
}

export type CreatePlanRequest = Omit<AdminPlan, 'id' | 'isActive'> & { isActive?: boolean };
export type UpdatePlanRequest = Partial<Omit<AdminPlan, 'id' | 'code'>>;

export interface PlatformAdminSummary {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePlatformAdminRequest {
  email: string;
  password: string;
}

export interface AdminMetrics {
  tenantsTotal: number;
  tenantsActive: number;
  tenantsTrialing: number;
  tenantsSuspended: number;
  mrr: number;
  signupsByMonth: Array<{ month: string; count: number }>;
}

export type PlatformNotificationChannel = 'inApp' | 'email' | 'push';

export interface PlatformNotificationTypeChannel {
  channel: PlatformNotificationChannel;
  enabled: boolean;
  isDefault: boolean;
}

export interface PlatformNotificationTypeSetting {
  type: string;
  description: string;
  label: string | null;
  defaultChannels: PlatformNotificationChannel[];
  channels: PlatformNotificationTypeChannel[];
  enabled: boolean;
}

export interface PlatformNotificationChannelSetting {
  channel: PlatformNotificationChannel;
  enabled: boolean;
}

// F31 — catálogo global de textos legibles de permisos, editable en
// runtime solo desde Super-Admin. Mismo shape que PermissionResponseDto del
// backend (permission.mapper.ts): label/groupLabel nunca vienen vacíos.
export interface AdminPermission {
  id: string;
  code: string;
  description: string;
  label: string;
  groupCode: string;
  groupLabel: string;
  groupDescription: string | null;
}

export interface AdminPermissionGroup {
  code: string;
  label: string;
  description: string | null;
}

export interface UpdatePermissionLabelRequest {
  label?: string;
  description?: string;
}

export interface UpdatePermissionGroupRequest {
  label?: string;
  description?: string;
}
