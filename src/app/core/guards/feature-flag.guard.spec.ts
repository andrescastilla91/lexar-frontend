import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';
import { chatbotFeatureGuard } from './feature-flag.guard';
import { SubscriptionService } from '../services/subscription.service';
import { Entitlements } from '../models/subscription-backend.model';

function makeEntitlements(chatbot: boolean): Entitlements {
  return {
    planCode: 'PROFESIONAL',
    planName: 'Profesional',
    status: 'active',
    isReadOnly: false,
    trialEndsAt: null,
    currentPeriodEnd: new Date().toISOString(),
    cancelAtPeriodEnd: false,
    features: { chatbot, clientPortal: false, advancedReports: false },
    limits: { maxUsers: null, maxActiveProcesses: null, maxStorageMb: null },
    usage: { users: 1, activeProcesses: 0, storageMb: 0 },
  };
}

describe('chatbotFeatureGuard', () => {
  let routerMock: { createUrlTree: jest.Mock };
  let subscriptionServiceMock: { getEntitlements: jest.Mock };

  beforeEach(() => {
    routerMock = { createUrlTree: jest.fn() };
    subscriptionServiceMock = { getEntitlements: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
      ],
    });
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() => chatbotFeatureGuard({} as never, {} as never));
  }

  it('permite el acceso cuando el plan incluye el entitlement chatbot', (done) => {
    subscriptionServiceMock.getEntitlements.mockReturnValue(of(makeEntitlements(true)));

    (runGuard() as ReturnType<typeof chatbotFeatureGuard>).subscribe((result) => {
      expect(result).toBe(true);
      done();
    });
  });

  it('redirige a dashboard cuando el plan no incluye el entitlement chatbot', (done) => {
    subscriptionServiceMock.getEntitlements.mockReturnValue(of(makeEntitlements(false)));
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    (runGuard() as ReturnType<typeof chatbotFeatureGuard>).subscribe((result) => {
      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
      expect(result).toBe(urlTree);
      done();
    });
  });
});
