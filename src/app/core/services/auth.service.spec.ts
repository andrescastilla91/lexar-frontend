import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { AuthUser } from '../models/auth.model';
import { environment } from '../../../environments/environment';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/auth`;
  const user: AuthUser = { email: 'admin@lexar.com', roles: ['admin'], permissions: ['clients.view'] };

  beforeEach(() => {
    // BUG-20 ola 2: se incluye errorInterceptor real en el pipeline — en
    // producción el servicio siempre recibe el error YA procesado por él.
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: { isPlanGateError: () => false, promptUpgrade: () => {} } },
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
    let result: { success: boolean; requires2fa?: boolean; user?: AuthUser } | undefined;

    service.login(user.email, 'Passw0rd!').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', requires2fa: false, user });

    expect(result).toEqual({ success: true, requires2fa: false, user });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual(expect.objectContaining(user));
  });

  it('login con 2FA activo no abre sesión y devuelve el pendingToken', () => {
    let result: { success: boolean; requires2fa?: boolean; pendingToken?: string } | undefined;

    service.login(user.email, 'Passw0rd!').subscribe((r) => (result = r));

    httpMock
      .expectOne(`${apiUrl}/login`)
      .flush({ message: 'Ingresa el código', requires2fa: true, pendingToken: 'pending-abc' });

    expect(result).toEqual({
      success: true,
      requires2fa: true,
      pendingToken: 'pending-abc',
      message: 'Ingresa el código',
    });
    expect(service.isAuthenticated()).toBe(false);
  });

  it('loginWithTwoFactor completa la sesión con un código válido', () => {
    let result: { success: boolean; user?: AuthUser } | undefined;

    service.loginWithTwoFactor('pending-abc', '123456').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/login/2fa`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ pendingToken: 'pending-abc', code: '123456' });
    req.flush({ message: 'ok', user });

    expect(result).toEqual({ success: true, user });
    expect(service.isAuthenticated()).toBe(true);
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

  it('setupTwoFactor hace POST a /auth/2fa/setup y expone el secreto y el QR', () => {
    let result: { otpauthUri: string; secret: string } | undefined;
    service.setupTwoFactor().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/2fa/setup`);
    expect(req.request.method).toBe('POST');
    req.flush({ otpauthUri: 'otpauth://totp/x', secret: 'SECRET123' });

    expect(result).toEqual({ otpauthUri: 'otpauth://totp/x', secret: 'SECRET123' });
  });

  it('verifyTwoFactor marca twoFactorEnabled en memoria y expone los códigos de recuperación', () => {
    service.login(user.email, 'Passw0rd!').subscribe();
    httpMock.expectOne(`${apiUrl}/login`).flush({ message: 'ok', requires2fa: false, user });

    let result: { recoveryCodes: string[] } | undefined;
    service.verifyTwoFactor('123456').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/2fa/verify`);
    expect(req.request.body).toEqual({ code: '123456' });
    req.flush({ message: 'ok', recoveryCodes: ['AAAAA-BBBBB'] });

    expect(result?.recoveryCodes).toEqual(['AAAAA-BBBBB']);
    expect(service.currentUser()?.twoFactorEnabled).toBe(true);
  });

  it('disableTwoFactor limpia twoFactorEnabled en memoria', () => {
    service.login(user.email, 'Passw0rd!').subscribe();
    httpMock
      .expectOne(`${apiUrl}/login`)
      .flush({ message: 'ok', requires2fa: false, user: { ...user, twoFactorEnabled: true } });

    service.disableTwoFactor('Passw0rd!', '123456').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/2fa/disable`);
    expect(req.request.body).toEqual({ password: 'Passw0rd!', code: '123456' });
    req.flush({ message: 'ok' });

    expect(service.currentUser()?.twoFactorEnabled).toBe(false);
  });

  it('regenerateTwoFactorRecoveryCodes hace POST a /auth/2fa/recovery-codes/regenerate', () => {
    let result: { recoveryCodes: string[] } | undefined;
    service.regenerateTwoFactorRecoveryCodes('Passw0rd!', '123456').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/2fa/recovery-codes/regenerate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ password: 'Passw0rd!', code: '123456' });
    req.flush({ message: 'ok', recoveryCodes: ['CCCCC-DDDDD'] });

    expect(result?.recoveryCodes).toEqual(['CCCCC-DDDDD']);
  });

  it('forgotTwoFactor hace POST a /auth/forgot-2fa y expone el mensaje ciego', () => {
    let result: { success: boolean; message?: string } | undefined;
    service.forgotTwoFactor('user@lexar.com').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/forgot-2fa`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@lexar.com' });
    req.flush({ message: 'Si el correo existe...' });

    expect(result).toEqual({ success: true, message: 'Si el correo existe...' });
  });
});
