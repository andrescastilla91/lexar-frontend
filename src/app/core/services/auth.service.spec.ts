import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { AuthUser } from '../models/auth.model';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/auth`;
  const user: AuthUser = { email: 'admin@lexar.com', roles: ['admin'], permissions: ['clients.view'] };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jest.fn() } },
        {
          provide: ProfileService,
          useValue: { getMe: jest.fn().mockReturnValue(of({ firstName: '', lastName: '', avatarUrl: null })) },
        },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('login exitoso actualiza el usuario en memoria', () => {
    let result: { success: boolean; user?: AuthUser } | undefined;

    service.login(user.email, 'Passw0rd!').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', user });

    expect(result).toEqual({ success: true, user });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual(expect.objectContaining(user));
  });

  it('login fallido no autentica y expone el mensaje del backend', () => {
    let result: { success: boolean; message?: string } | undefined;

    service.login(user.email, 'wrong').subscribe((r) => (result = r));

    httpMock
      .expectOne(`${apiUrl}/login`)
      .flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });

    expect(result).toEqual({ success: false, message: 'Credenciales inválidas' });
    expect(service.isAuthenticated()).toBe(false);
  });

  it('logout limpia la sesión incluso si el backend responde con error', () => {
    service.login(user.email, 'Passw0rd!').subscribe();
    httpMock.expectOne(`${apiUrl}/login`).flush({ message: 'ok', user });

    service.logout().subscribe();
    httpMock.expectOne(`${apiUrl}/logout`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('refreshToken exitoso encadena con getProfile y reautentica', () => {
    let result: boolean | undefined;

    service.refreshToken().subscribe((r) => (result = r));

    httpMock.expectOne(`${apiUrl}/refresh`).flush({ message: 'ok' });
    httpMock.expectOne(`${apiUrl}/me`).flush({ email: user.email, roles: user.roles, permissions: user.permissions });

    expect(result).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('refreshToken fallido limpia la sesión y retorna false', () => {
    let result: boolean | undefined;

    service.refreshToken().subscribe((r) => (result = r));

    httpMock.expectOne(`${apiUrl}/refresh`).flush('error', { status: 401, statusText: 'Unauthorized' });

    expect(result).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('getProfile propaga emailVerified al usuario en memoria', () => {
    service.getProfile().subscribe();

    httpMock.expectOne(`${apiUrl}/me`).flush({
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      emailVerified: false,
    });

    expect(service.currentUser()?.emailVerified).toBe(false);
  });

  it('getProfile propaga isOwner al usuario en memoria', () => {
    service.getProfile().subscribe();

    httpMock.expectOne(`${apiUrl}/me`).flush({
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      emailVerified: false,
      isOwner: true,
    });

    expect(service.currentUser()?.isOwner).toBe(true);
  });

  it('login propaga isOwner del backend al usuario en memoria', () => {
    let result: { success: boolean; user?: AuthUser } | undefined;

    service.login(user.email, 'Passw0rd!').subscribe((r) => (result = r));

    httpMock
      .expectOne(`${apiUrl}/login`)
      .flush({ message: 'ok', user: { ...user, emailVerified: false, isOwner: true } });

    expect(result?.user?.isOwner).toBe(true);
    expect(service.currentUser()?.isOwner).toBe(true);
  });

  it('verifyEmail en éxito marca emailVerified en memoria', () => {
    service.login(user.email, 'Passw0rd!').subscribe();
    httpMock.expectOne(`${apiUrl}/login`).flush({ message: 'ok', user: { ...user, emailVerified: false } });

    let result: { success: boolean } | undefined;
    service.verifyEmail('token-123').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/verify-email`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'token-123' });
    req.flush({ message: 'Correo verificado exitosamente' });

    expect(result?.success).toBe(true);
    expect(service.currentUser()?.emailVerified).toBe(true);
  });

  it('verifyEmail en error expone el mensaje del backend', () => {
    let result: { success: boolean; message?: string } | undefined;
    service.verifyEmail('token-invalido').subscribe((r) => (result = r));

    httpMock
      .expectOne(`${apiUrl}/verify-email`)
      .flush({ message: 'El enlace es inválido o ya expiró' }, { status: 400, statusText: 'Bad Request' });

    expect(result).toEqual({ success: false, message: 'El enlace es inválido o ya expiró' });
  });

  it('resendVerification hace POST a /auth/resend-verification', () => {
    let result: { success: boolean } | undefined;
    service.resendVerification().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/resend-verification`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok' });

    expect(result?.success).toBe(true);
  });
});
