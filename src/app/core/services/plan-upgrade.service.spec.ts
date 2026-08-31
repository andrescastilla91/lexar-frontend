import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PlanUpgradeService } from './plan-upgrade.service';
import { SubscriptionService } from './subscription.service';
import { ToastService } from './toast.service';
import { Entitlements, PlanCatalogEntry, PlanFeatures } from '../models/subscription-backend.model';

describe('PlanUpgradeService', () => {
  let service: PlanUpgradeService;
  let subscriptionServiceMock: { getEntitlements: jest.Mock; getPlanCatalog: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const baseFeatures: PlanFeatures = {
    chatbot: true,
    clientPortal: true,
    advancedReports: false,
    taskApprovals: false,
    customCatalogs: false,
    mandatory2faPolicy: false,
    exportableReports: false,
    exportableAudit: false,
    earlyAccess: false,
  };

  const plans: PlanCatalogEntry[] = [
    {
      code: 'INDEPENDIENTE',
      name: 'Independiente',
      priceMonthly: 89000,
      priceYearly: 890000,
      currency: 'COP',
      maxUsers: 2,
      maxActiveProcesses: 40,
      maxStorageMb: 5120,
      aiCreditsMonth: 20,
      portalClientsMax: 5,
      features: { ...baseFeatures },
      sortOrder: 1,
    },
    {
      code: 'ESTUDIO',
      name: 'Estudio',
      priceMonthly: 249000,
      priceYearly: 2490000,
      currency: 'COP',
      maxUsers: 10,
      maxActiveProcesses: 100,
      maxStorageMb: 15360,
      aiCreditsMonth: 100,
      portalClientsMax: null,
      features: { ...baseFeatures, taskApprovals: true, customCatalogs: true, mandatory2faPolicy: true },
      sortOrder: 2,
    },
    {
      code: 'FIRMA',
      name: 'Firma',
      priceMonthly: 590000,
      priceYearly: 5900000,
      currency: 'COP',
      maxUsers: null,
      maxActiveProcesses: null,
      maxStorageMb: 51200,
      aiCreditsMonth: 500,
      portalClientsMax: null,
      features: { ...baseFeatures, taskApprovals: true, customCatalogs: true, mandatory2faPolicy: true, exportableAudit: true },
      sortOrder: 3,
    },
  ];

  function entitlementsFor(planCode: string): Entitlements {
    return {
      planCode,
      planName: planCode,
      status: 'active',
      isReadOnly: false,
      trialEndsAt: null,
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: false,
      features: baseFeatures,
      limits: { maxUsers: 2, maxActiveProcesses: 40, maxStorageMb: 5120, aiCreditsMonth: 20, portalClientsMax: 5 },
      usage: { users: 1, activeProcesses: 1, storageMb: 1 },
    };
  }

  beforeEach(() => {
    subscriptionServiceMock = {
      getEntitlements: jest.fn().mockReturnValue(of(entitlementsFor('INDEPENDIENTE'))),
      getPlanCatalog: jest.fn().mockReturnValue(of(plans)),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });
    service = TestBed.inject(PlanUpgradeService);
  });

  describe('isPlanGateError', () => {
    it('reconoce FEATURE_NOT_IN_PLAN', () => {
      expect(service.isPlanGateError({ error: { code: 'FEATURE_NOT_IN_PLAN', message: 'x' } })).toBe(true);
    });

    it('reconoce LIMIT_REACHED', () => {
      expect(service.isPlanGateError({ error: { code: 'LIMIT_REACHED', message: 'x' } })).toBe(true);
    });

    it('no reconoce otros códigos ni errores sin código', () => {
      expect(service.isPlanGateError({ error: { code: 'OTRO', message: 'x' } })).toBe(false);
      expect(service.isPlanGateError({ error: { message: 'x' } })).toBe(false);
      expect(service.isPlanGateError({})).toBe(false);
      expect(service.isPlanGateError(null)).toBe(false);
      expect(service.isPlanGateError(undefined)).toBe(false);
    });
  });

  describe('promptUpgrade', () => {
    it('FEATURE_NOT_IN_PLAN: sugiere el plan más barato que sí tiene la capacidad', () => {
      service.promptUpgrade({
        error: { code: 'FEATURE_NOT_IN_PLAN', message: 'Tu plan actual no incluye esta funcionalidad', feature: 'customCatalogs' },
      });

      expect(toastServiceMock.error).toHaveBeenCalledWith('Tu plan actual no incluye esta funcionalidad', {
        label: 'Ver planes',
        routerLink: ['/configuracion'],
        queryParams: { tab: 'plan', suggested: 'ESTUDIO' },
      });
    });

    it('LIMIT_REACHED: sugiere el siguiente escalón por encima del plan actual', () => {
      service.promptUpgrade({
        error: { code: 'LIMIT_REACHED', message: 'Llegaste al límite de tu plan', limit: 'portalClientsMax' },
      });

      expect(toastServiceMock.error).toHaveBeenCalledWith('Llegaste al límite de tu plan', {
        label: 'Ver planes',
        routerLink: ['/configuracion'],
        queryParams: { tab: 'plan', suggested: 'ESTUDIO' },
      });
    });

    it('LIMIT_REACHED en el plan más alto: no hay siguiente escalón, el CTA queda sin plan resaltado', () => {
      subscriptionServiceMock.getEntitlements.mockReturnValue(of(entitlementsFor('FIRMA')));

      service.promptUpgrade({
        error: { code: 'LIMIT_REACHED', message: 'Llegaste al límite de tu plan', limit: 'maxUsers' },
      });

      expect(toastServiceMock.error).toHaveBeenCalledWith('Llegaste al límite de tu plan', {
        label: 'Ver planes',
        routerLink: ['/configuracion'],
        queryParams: { tab: 'plan' },
      });
    });

    it('tenant en TRIAL (fuera del catálogo pago): sugiere el plan pago más barato', () => {
      subscriptionServiceMock.getEntitlements.mockReturnValue(of(entitlementsFor('TRIAL')));

      service.promptUpgrade({
        error: { code: 'LIMIT_REACHED', message: 'Llegaste al límite de tu plan', limit: 'maxUsers' },
      });

      expect(toastServiceMock.error).toHaveBeenCalledWith(
        'Llegaste al límite de tu plan',
        expect.objectContaining({ queryParams: { tab: 'plan', suggested: 'INDEPENDIENTE' } }),
      );
    });
  });
});
