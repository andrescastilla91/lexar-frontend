import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortalAuthService } from './portal-auth.service';
import { PortalUser } from '../models/portal.model';
import { environment } from '../../../environments/environment';

describe('PortalAuthService', () => {
  let service: PortalAuthService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/portal/auth`;
  const user: PortalUser = {
    id: 'pu-1',
    email: 'cliente@x.com',
    clientId: 'client-1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PortalAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('empieza sin sesión (isAuthenticated en false, currentPortalUser en null)', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentPortalUser()).toBeNull();
  });

  it('login exitoso guarda el usuario en memoria y marca isAuthenticated', () => {
    let result: { success: boolean; user?: PortalUser } | undefined;

    service.login(user.email, 'Passw0rd!').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: user.email, password: 'Passw0rd!' });
    req.flush({ message: 'ok', user });

    expect(result).toEqual({ success: true, user });
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentPortalUser()).toEqual(user);
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

  it('login fallido sin mensaje del backend usa el mensaje genérico', () => {
    let result: { success: boolean; message?: string } | undefined;

    service.login(user.email, 'wrong').subscribe((r) => (result = r));

    httpMock.expectOne(`${apiUrl}/login`).flush('error', { status: 401, statusText: 'Unauthorized' });

    expect(result?.success).toBe(false);
    expect(result?.message).toBe('Error al iniciar sesión. Verifica tus credenciales.');
  });

  it('logout limpia la sesión incluso si el backend responde con error', () => {
    service.login(user.email, 'Passw0rd!').subscribe();
    httpMock.expectOne(`${apiUrl}/login`).flush({ message: 'ok', user });

    service.logout().subscribe();
    httpMock.expectOne(`${apiUrl}/logout`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentPortalUser()).toBeNull();
  });

  it('logout exitoso limpia la sesión', () => {
    service.login(user.email, 'Passw0rd!').subscribe();
    httpMock.expectOne(`${apiUrl}/login`).flush({ message: 'ok', user });

    service.logout().subscribe();
    httpMock.expectOne(`${apiUrl}/logout`).flush({ message: 'ok' });

    expect(service.isAuthenticated()).toBe(false);
  });

  it('getProfile guarda el usuario en memoria', () => {
    service.getProfile().subscribe();

    httpMock.expectOne(`${apiUrl}/me`).flush(user);

    expect(service.currentPortalUser()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('getProfile en error limpia la sesión y resuelve null (sondeo silencioso)', () => {
    let result: PortalUser | null | undefined;

    service.getProfile().subscribe((r) => (result = r));

    httpMock.expectOne(`${apiUrl}/me`).flush('error', { status: 401, statusText: 'Unauthorized' });

    expect(result).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('refreshToken exitoso encadena con getProfile y reautentica', () => {
    let result: boolean | undefined;

    service.refreshToken().subscribe((r) => (result = r));

    httpMock.expectOne(`${apiUrl}/refresh`).flush({ message: 'ok' });
    httpMock.expectOne(`${apiUrl}/me`).flush(user);

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

  it('acceptInvitation exitoso encadena con getProfile y abre sesión', () => {
    let result: { success: boolean } | undefined;

    service.acceptInvitation('token-abc', 'NuevaPass1!').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/accept-invitation`);
    expect(req.request.body).toEqual({ token: 'token-abc', password: 'NuevaPass1!' });
    req.flush({ message: 'ok' });
    httpMock.expectOne(`${apiUrl}/me`).flush(user);

    expect(result).toEqual({ success: true });
    expect(service.isAuthenticated()).toBe(true);
  });

  it('acceptInvitation con token inválido expone el mensaje del backend', () => {
    let result: { success: boolean; message?: string } | undefined;

    service.acceptInvitation('token-malo', 'NuevaPass1!').subscribe((r) => (result = r));

    httpMock
      .expectOne(`${apiUrl}/accept-invitation`)
      .flush({ message: 'El token ya fue usado' }, { status: 400, statusText: 'Bad Request' });

    expect(result).toEqual({ success: false, message: 'El token ya fue usado' });
  });

  it('forgotPassword hace POST y expone el mensaje ciego del backend', () => {
    let result: { success: boolean; message?: string } | undefined;

    service.forgotPassword('cliente@x.com').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'cliente@x.com' });
    req.flush({ message: 'Si el correo existe...' });

    expect(result).toEqual({ success: true, message: 'Si el correo existe...' });
  });

  it('forgotPassword en error expone el mensaje genérico si el backend no da uno', () => {
    let result: { success: boolean; message?: string } | undefined;

    service.forgotPassword('cliente@x.com').subscribe((r) => (result = r));

    httpMock.expectOne(`${apiUrl}/forgot-password`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(result?.success).toBe(false);
    expect(result?.message).toBe('No pudimos procesar tu solicitud. Intenta de nuevo en unos minutos.');
  });

  it('resetPassword hace POST con el token y la nueva contraseña', () => {
    let result: { success: boolean; message?: string } | undefined;

    service.resetPassword('token-reset', 'NuevaPass1!').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/reset-password`);
    expect(req.request.body).toEqual({ token: 'token-reset', newPassword: 'NuevaPass1!' });
    req.flush({ message: 'Contraseña actualizada' });

    expect(result).toEqual({ success: true, message: 'Contraseña actualizada' });
  });

  it('resetPassword con token expirado expone el mensaje del backend', () => {
    let result: { success: boolean; message?: string } | undefined;

    service.resetPassword('token-vencido', 'NuevaPass1!').subscribe((r) => (result = r));

    httpMock
      .expectOne(`${apiUrl}/reset-password`)
      .flush({ message: 'El enlace ya expiró' }, { status: 400, statusText: 'Bad Request' });

    expect(result).toEqual({ success: false, message: 'El enlace ya expiró' });
  });

  it('clearSession limpia el usuario en memoria sin llamar al backend', () => {
    service.login(user.email, 'Passw0rd!').subscribe();
    httpMock.expectOne(`${apiUrl}/login`).flush({ message: 'ok', user });
    expect(service.isAuthenticated()).toBe(true);

    service.clearSession();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentPortalUser()).toBeNull();
  });
});
