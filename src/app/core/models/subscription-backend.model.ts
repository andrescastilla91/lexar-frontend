/**
 * Backend Subscription/Entitlements DTOs (F7 — planes, suscripciones y licenciamiento)
 */

export interface PlanFeatures {
  chatbot: boolean;
  clientPortal: boolean;
  advancedReports: boolean;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';

export interface EntitlementsLimits {
  maxUsers: number | null;
  maxActiveProcesses: number | null;
  maxStorageMb: number | null;
}

export interface EntitlementsUsage {
  users: number;
  activeProcesses: number;
  storageMb: number;
}

export interface Entitlements {
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  isReadOnly: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  features: PlanFeatures;
  limits: EntitlementsLimits;
  usage: EntitlementsUsage;
}

export interface EntitlementsResponse {
  entitlements: Entitlements;
}

export interface PlanCatalogEntry {
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxUsers: number | null;
  maxActiveProcesses: number | null;
  maxStorageMb: number | null;
  features: PlanFeatures;
  sortOrder: number;
}

export interface PlanCatalogResponse {
  plans: PlanCatalogEntry[];
}

export interface CreateCheckoutRequest {
  planCode: string;
  billingCycle: 'monthly' | 'yearly';
}

export interface CheckoutLinkResponse {
  checkout: { url: string; reference: string };
}

export interface CancelSubscriptionResponse {
  message: string;
  cancelAtPeriodEnd: boolean;
  effectiveAt: string;
}
