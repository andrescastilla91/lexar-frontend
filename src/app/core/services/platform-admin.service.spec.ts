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

  // Bug corregido 2026-07-27: el login por sí solo NUNCA abre sesión — el
  // 2FA es obligatorio sin excepción para platform admins (F11/S10), así que
  // /admin/auth/login solo devuelve un pendingToken, nunca cookie ni `user`.
  it('login hace POST a /admin/auth/login y devuelve el resultado sin abrir sesión', () => {
    let result: { requiresSetup: boolean; requires2fa: boolean; pendingToken: string } | undefined;
    service.login('admin@lexar.com', 'secret').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${authUrl}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'admin@lexar.com', password: 'secret' });
    req.flush({ requiresSetup: false, requires2fa: true, pendingToken: 'ptok-1' });

    expect(result).toEqual({ requiresSetup: false, requires2fa: true, pendingToken: 'ptok-1' });
    expect(service.isAuthenticated()).toBe(false);
  });

  it('login en error no marca al admin como autenticado', () => {
    let error: Error | undefined;
    service.login('admin@lexar.com', 'bad').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${authUrl}/login`).flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });

    expect(error?.message).toBe('Credenciales inválidas');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('setupTwoFactor hace POST a /admin/auth/2fa/setup con el pendingToken', () => {
    let result: { otpauthUri: string; secret: string } | undefined;
    service.setupTwoFactor('ptok-2').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${authUrl}/2fa/setup`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ pendingToken: 'ptok-2' });
    req.flush({ otpauthUri: 'otpauth://totp/x', secret: 'SECRET123' });

    expect(result).toEqual({ otpauthUri: 'otpauth://totp/x', secret: 'SECRET123' });
    expect(service.isAuthenticated()).toBe(false);
  });

  it('verifyTwoFactorSetup hace POST a /admin/auth/2fa/verify y ahí sí abre sesión', () => {
    let result: { user: { email: string }; recoveryCodes: string[] } | undefined;
    service.verifyTwoFactorSetup('ptok-2', '654321').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${authUrl}/2fa/verify`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ pendingToken: 'ptok-2', code: '654321' });
    req.flush({ user: { email: 'admin@lexar.com' }, recoveryCodes: ['a1', 'a2'] });

    expect(result?.recoveryCodes).toEqual(['a1', 'a2']);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('loginWithTwoFactor hace POST a /admin/auth/login/2fa y abre sesión', () => {
    let result: { email: string } | undefined;
    service.loginWithTwoFactor('ptok-1', '123456').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${authUrl}/login/2fa`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ pendingToken: 'ptok-1', code: '123456' });
    req.flush({ message: 'ok', user: { email: 'admin@lexar.com' } });

    expect(result).toEqual({ email: 'admin@lexar.com' });
    expect(service.isAuthenticated()).toBe(true);
  });

  it('logout hace POST a /admin/auth/logout y limpia el estado', () => {
    service.loginWithTwoFactor('ptok-1', '123456').subscribe();
    httpMock.expectOne(`${authUrl}/login/2fa`).flush({ message: 'ok', user: { email: 'admin@lexar.com' } });
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
