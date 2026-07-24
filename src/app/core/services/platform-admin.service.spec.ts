import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformAdminService } from './platform-admin.service';
import { environment } from '../../../environments/environment';

describe('PlatformAdminService', () => {
  let service: PlatformAdminService;
  let httpMock: HttpTestingController;
  const authUrl = `${environment.apiUrl}/admin/auth`;
  const apiUrl = `${environment.apiUrl}/admin`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PlatformAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('login hace POST a /admin/auth/login y guarda el admin autenticado', () => {
    let result: { email: string } | undefined;
    service.login('admin@lexar.com', 'secret').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${authUrl}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'admin@lexar.com', password: 'secret' });
    req.flush({ message: 'ok', user: { email: 'admin@lexar.com' } });

    expect(result).toEqual({ email: 'admin@lexar.com' });
    expect(service.isAuthenticated()).toBe(true);
  });

  it('login en error no marca al admin como autenticado', () => {
    let error: Error | undefined;
    service.login('admin@lexar.com', 'bad').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${authUrl}/login`).flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });

    expect(error?.message).toBe('Credenciales inválidas');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('logout hace POST a /admin/auth/logout y limpia el estado', () => {
    service.login('admin@lexar.com', 'secret').subscribe();
    httpMock.expectOne(`${authUrl}/login`).flush({ message: 'ok', user: { email: 'admin@lexar.com' } });
    expect(service.isAuthenticated()).toBe(true);

    service.logout().subscribe();
    httpMock.expectOne(`${authUrl}/logout`).flush({ message: 'ok' });

    expect(service.isAuthenticated()).toBe(false);
  });

  it('getProfile hace GET a /admin/auth/me y setea el admin actual', () => {
    service.getProfile().subscribe();

    httpMock.expectOne(`${authUrl}/me`).flush({ email: 'admin@lexar.com' });

    expect(service.currentAdmin()).toEqual({ email: 'admin@lexar.com' });
  });

  it('getProfile en error no lanza — deja al admin como no autenticado', () => {
    let result: unknown;
    service.getProfile().subscribe((r) => (result = r));

    httpMock.expectOne(`${authUrl}/me`).flush({ message: 'forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(result).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('listTenants hace GET a /admin/tenants y extrae el arreglo', () => {
    let tenants: unknown;
    service.listTenants().subscribe((t) => (tenants = t));

    httpMock.expectOne(`${apiUrl}/tenants`).flush({ tenants: [{ id: 't1' }] });

    expect(tenants).toEqual([{ id: 't1' }]);
  });

  it('updateSubscription hace PATCH a /admin/tenants/:id/subscription con el dto', () => {
    service.updateSubscription('company-1', { action: 'extend_trial', days: 7 }).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/tenants/company-1/subscription`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ action: 'extend_trial', days: 7 });
    req.flush({ message: 'ok' });
  });

  it('impersonate hace POST a /admin/tenants/:id/impersonate/:userId', () => {
    service.impersonate('company-1', 'user-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/tenants/company-1/impersonate/user-1`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok' });
  });

  it('createPlan hace POST a /admin/plans y extrae el plan creado', () => {
    let plan: unknown;
    service
      .createPlan({
        code: 'ENTERPRISE',
        name: 'Enterprise',
        priceMonthly: 1_000_000,
        priceYearly: 10_000_000,
        currency: 'COP',
        maxUsers: null,
        maxActiveProcesses: null,
        maxStorageMb: null,
        sortOrder: 4,
        features: { chatbot: true, clientPortal: true, advancedReports: true },
      })
      .subscribe((p) => (plan = p));

    httpMock.expectOne(`${apiUrl}/plans`).flush({ plan: { id: 'plan-x', code: 'ENTERPRISE' } });

    expect(plan).toEqual({ id: 'plan-x', code: 'ENTERPRISE' });
  });

  it('deactivatePlan hace DELETE a /admin/plans/:id', () => {
    service.deactivatePlan('plan-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/plans/plan-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ plan: { id: 'plan-1', isActive: false } });
  });

  it('listPlatformAdmins hace GET a /admin/platform-admins y extrae el arreglo', () => {
    let admins: unknown;
    service.listPlatformAdmins().subscribe((a) => (admins = a));

    httpMock.expectOne(`${apiUrl}/platform-admins`).flush({ platformAdmins: [{ id: 'a1', email: 'a@lexar.com' }] });

    expect(admins).toEqual([{ id: 'a1', email: 'a@lexar.com' }]);
  });

  it('createPlatformAdmin hace POST a /admin/platform-admins', () => {
    service.createPlatformAdmin({ email: 'nuevo@lexar.com', password: 'password123' }).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/platform-admins`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'nuevo@lexar.com', password: 'password123' });
    req.flush({ platformAdmin: { id: 'a2', email: 'nuevo@lexar.com' } });
  });

  it('togglePlatformAdminActive hace PATCH a /admin/platform-admins/:id/toggle-active', () => {
    service.togglePlatformAdminActive('a1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/platform-admins/a1/toggle-active`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ platformAdmin: { id: 'a1', isActive: false } });
  });

  it('getMetrics hace GET a /admin/metrics y extrae las métricas', () => {
    let metrics: unknown;
    service.getMetrics().subscribe((m) => (metrics = m));

    httpMock.expectOne(`${apiUrl}/metrics`).flush({ metrics: { tenantsTotal: 5 } });

    expect(metrics).toEqual({ tenantsTotal: 5 });
  });
});
