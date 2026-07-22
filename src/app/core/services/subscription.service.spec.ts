import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SubscriptionService } from './subscription.service';
import { Entitlements } from '../models/subscription-backend.model';
import { environment } from '../../../environments/environment';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/subscription`;

  const entitlements: Entitlements = {
    planCode: 'PROFESIONAL',
    planName: 'Profesional',
    status: 'active',
    isReadOnly: false,
    trialEndsAt: null,
    currentPeriodEnd: new Date().toISOString(),
    cancelAtPeriodEnd: false,
    features: { chatbot: true, clientPortal: true, advancedReports: false },
    limits: { maxUsers: 10, maxActiveProcesses: 100, maxStorageMb: 10240 },
    usage: { users: 3, activeProcesses: 5, storageMb: 120 },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SubscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getEntitlements hace GET a /subscription y extrae entitlements', () => {
    let result: Entitlements | undefined;
    service.getEntitlements().subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ entitlements });

    expect(result).toEqual(entitlements);
  });

  it('getEntitlements cachea el resultado: dos suscripciones solo disparan un GET', () => {
    service.getEntitlements().subscribe();
    service.getEntitlements().subscribe();

    const req = httpMock.expectOne(apiUrl);
    req.flush({ entitlements });

    httpMock.expectNone(apiUrl);
  });

  it('invalidate() limpia el caché y fuerza un nuevo GET en la siguiente llamada', () => {
    service.getEntitlements().subscribe();
    httpMock.expectOne(apiUrl).flush({ entitlements });

    service.invalidate();
    service.getEntitlements().subscribe();

    httpMock.expectOne(apiUrl).flush({ entitlements });
  });

  it('cancelAtPeriodEnd hace POST a /subscription/cancel e invalida el caché', () => {
    service.getEntitlements().subscribe();
    httpMock.expectOne(apiUrl).flush({ entitlements });

    service.cancelAtPeriodEnd().subscribe();
    const cancelReq = httpMock.expectOne(`${apiUrl}/cancel`);
    expect(cancelReq.request.method).toBe('POST');
    cancelReq.flush({
      message: 'ok',
      cancelAtPeriodEnd: true,
      effectiveAt: entitlements.currentPeriodEnd,
    });

    // Si el caché no se hubiera invalidado, esto reutilizaría el observable anterior.
    service.getEntitlements().subscribe();
    httpMock.expectOne(apiUrl).flush({ entitlements });
  });

  it('createCheckout hace POST a /subscription/checkout con el body dado', () => {
    let url: string | undefined;
    service.createCheckout({ planCode: 'FIRMA', billingCycle: 'yearly' }).subscribe((c) => (url = c.url));

    const req = httpMock.expectOne(`${apiUrl}/checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ planCode: 'FIRMA', billingCycle: 'yearly' });
    req.flush({ checkout: { url: 'https://checkout.wompi.co/p/?x=1', reference: 'ref-1' } });

    expect(url).toBe('https://checkout.wompi.co/p/?x=1');
  });

  it('propaga el mensaje de error del backend cuando el GET falla', () => {
    let error: Error | undefined;
    service.getEntitlements().subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(apiUrl)
      .flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No autorizado');
  });
});
