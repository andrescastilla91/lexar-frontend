export interface PlatformAdminUser {
  email: string;
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

export interface PlanFeaturesAdmin {
  chatbot: boolean;
  clientPortal: boolean;
  advancedReports: boolean;
}

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
