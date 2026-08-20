import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { portalAuthInterceptor } from './portal-auth.interceptor';
import { PortalAuthService } from '../services/portal-auth.service';

describe('portalAuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let portalAuthServiceMock: { refreshToken: jest.Mock };
  let routerMock: { navigate: jest.Mock };

  beforeEach(() => {
    portalAuthServiceMock = { refreshToken: jest.fn() };
    routerMock = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([portalAuthInterceptor])),
        provideHttpClientTesting(),
        { provide: PortalAuthService, useValue: portalAuthServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('no toca requests que no son de /portal/ (withCredentials queda intacto)', () => {
    http.get('/api/clients').subscribe();

    const req = httpMock.expectOne('/api/clients');
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });

  it('envía withCredentials en requests de /portal/', () => {
    http.get('/api/portal/procesos').subscribe();

    const req = httpMock.expectOne('/api/portal/procesos');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('propaga errores distintos de 401 sin intervenir', () => {
    let error: { status: number } | undefined;

    http.get('/api/portal/procesos').subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne('/api/portal/procesos')
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(error?.status).toBe(500);
    expect(portalAuthServiceMock.refreshToken).not.toHaveBeenCalled();
  });

  it('en 401 de un endpoint de acción de portal (login), no navega ni intenta refresh', () => {
    let error: { status: number } | undefined;

    http.post('/api/portal/auth/login', {}).subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne('/api/portal/auth/login')
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(portalAuthServiceMock.refreshToken).not.toHaveBeenCalled();
    expect(error?.status).toBe(401);
  });

  it('en 401 de un endpoint de acción de portal (accept-invitation), no navega ni intenta refresh', () => {
    let error: { status: number } | undefined;

    http.post('/api/portal/auth/accept-invitation', {}).subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne('/api/portal/auth/accept-invitation')
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(portalAuthServiceMock.refreshToken).not.toHaveBeenCalled();
    expect(error?.status).toBe(401);
  });

  it('en 401 de /portal/auth/me intenta refresh y reintenta la sonda si funciona', () => {
    portalAuthServiceMock.refreshToken.mockReturnValue(of(true));
    let result: unknown;

    http.get('/api/portal/auth/me').subscribe((r) => (result = r));
    httpMock
      .expectOne('/api/portal/auth/me')
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/portal/auth/me').flush({ email: 'cliente@x.com' });

    expect(portalAuthServiceMock.refreshToken).toHaveBeenCalled();
    expect(result).toEqual({ email: 'cliente@x.com' });
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('en 401 de /portal/auth/me, si el refresh también falla, no navega (visita anónima)', () => {
    portalAuthServiceMock.refreshToken.mockReturnValue(of(false));
    let error: { status: number } | undefined;

    http.get('/api/portal/auth/me').subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne('/api/portal/auth/me')
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(portalAuthServiceMock.refreshToken).toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(error?.status).toBe(401);
  });

  it('en 401 de /portal/auth/me, si el refresh falla con error, no navega', () => {
    portalAuthServiceMock.refreshToken.mockReturnValue(throwError(() => ({ status: 500 })));
    let error: unknown;

    http.get('/api/portal/auth/me').subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne('/api/portal/auth/me')
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(error).toEqual({ status: 500 });
  });

  it('en 401 de un endpoint de negocio de portal, refresca la sesión y reintenta la petición', () => {
    portalAuthServiceMock.refreshToken.mockReturnValue(of(true));
    let result: unknown;

    http.get('/api/portal/procesos').subscribe((r) => (result = r));
    httpMock
      .expectOne('/api/portal/procesos')
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/portal/procesos').flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('en 401 de un endpoint de negocio de portal, si el refresh falla, redirige a portal/login', () => {
    portalAuthServiceMock.refreshToken.mockReturnValue(of(false));
    let error: { status: number } | undefined;

    http.get('/api/portal/procesos').subscribe({ error: (e) => (error = e) });
    httpMock
      .expectOne('/api/portal/procesos')
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/portal/login']);
    expect(error?.status).toBe(401);
  });
});
