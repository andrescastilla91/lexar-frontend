import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceMock: { refreshToken: jest.Mock };
  let routerMock: { navigate: jest.Mock };

  beforeEach(() => {
    authServiceMock = { refreshToken: jest.fn() };
    routerMock = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('envía withCredentials en cada request', () => {
    http.get('/api/clients').subscribe();

    const req = httpMock.expectOne('/api/clients');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('propaga errores distintos de 401 sin intervenir', () => {
    let error: { status: number } | undefined;

    http.get('/api/clients').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne('/api/clients').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(error?.status).toBe(500);
    expect(authServiceMock.refreshToken).not.toHaveBeenCalled();
  });

  it('en 401 de /auth/me intenta refresh y reintenta la sonda si funciona (recarga de página)', () => {
    authServiceMock.refreshToken.mockReturnValue(of(true));
    let result: unknown;

    http.get('/api/auth/me').subscribe((r) => (result = r));
    httpMock.expectOne('/api/auth/me').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/auth/me').flush({ email: 'user@lexar.com' });

    expect(authServiceMock.refreshToken).toHaveBeenCalled();
    expect(result).toEqual({ email: 'user@lexar.com' });
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('en 401 de /auth/me, si el refresh también falla, no navega (puede ser visita anónima)', () => {
    authServiceMock.refreshToken.mockReturnValue(of(false));
    let error: { status: number } | undefined;

    http.get('/api/auth/me').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne('/api/auth/me').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.refreshToken).toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(error?.status).toBe(401);
  });

  it('en 401 de un endpoint de auth, redirige a login sin intentar refresh', () => {
    let error: { status: number } | undefined;

    http.post('/api/auth/login', {}).subscribe({ error: (e) => (error = e) });
    httpMock.expectOne('/api/auth/login').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    expect(authServiceMock.refreshToken).not.toHaveBeenCalled();
    expect(error?.status).toBe(401);
  });

  it('en 401 de un endpoint de negocio, refresca la sesión y reintenta la petición', () => {
    authServiceMock.refreshToken.mockReturnValue(of(true));
    let result: unknown;

    http.get('/api/clients').subscribe((r) => (result = r));
    httpMock.expectOne('/api/clients').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/clients').flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('si el refresh falla, redirige a login y propaga el error original', () => {
    authServiceMock.refreshToken.mockReturnValue(of(false));
    let error: { status: number } | undefined;

    http.get('/api/clients').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne('/api/clients').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    expect(error?.status).toBe(401);
  });

  it('en 401 de /admin/auth/me (sonda de sesión de platform-admin) no navega — puede ser cualquier visitante anónimo', () => {
    let error: { status: number } | undefined;

    http.get('/api/admin/auth/me').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne('/api/admin/auth/me').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(authServiceMock.refreshToken).not.toHaveBeenCalled();
    expect(error?.status).toBe(401);
  });

  it('en 401 de una acción real de admin, sí redirige a /admin/login', () => {
    let error: { status: number } | undefined;

    http.get('/api/admin/tenants').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne('/api/admin/tenants').flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/login']);
    expect(error?.status).toBe(401);
  });
});
