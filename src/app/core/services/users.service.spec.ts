import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersService } from './users.service';
import { UserBackend } from '../models/user-backend.model';
import { environment } from '../../../environments/environment';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/users`;

  const user: UserBackend = {
    id: 'user-1',
    firstName: 'Ana',
    lastName: 'Ríos',
    email: 'ana@lexar.com',
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    twoFactorEnabled: false,
    roles: [{ id: 'role-1', name: 'Coordinador' }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getUsers hace GET con page y limit por defecto', () => {
    let result: unknown;
    service.getUsers().subscribe((r) => (result = r));

    const req = httpMock.expectOne((r) => r.url === apiUrl && r.params.get('page') === '1' && r.params.get('limit') === '10');
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', users: [user], total: 1, page: 1, limit: 10 });

    expect(result).toEqual({ message: 'ok', users: [user], total: 1, page: 1, limit: 10 });
  });

  it('getUsers usa el page y limit provistos', () => {
    service.getUsers(3, 25).subscribe();

    const req = httpMock.expectOne((r) => r.url === apiUrl && r.params.get('page') === '3' && r.params.get('limit') === '25');
    req.flush({ message: 'ok', users: [], total: 0, page: 3, limit: 25 });
  });

  it('getUserById hace GET a /users/:id', () => {
    let result: unknown;
    service.getUserById('user-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/user-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', user });

    expect(result).toEqual({ message: 'ok', user });
  });

  it('createUser hace POST con el payload', () => {
    let result: unknown;
    service.createUser({ firstName: 'Nuevo', lastName: 'Usuario', email: 'nuevo@lexar.com' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ firstName: 'Nuevo', lastName: 'Usuario', email: 'nuevo@lexar.com' });
    req.flush({ message: 'ok', user });

    expect(result).toEqual({ message: 'ok', user });
  });

  it('updateUser hace PUT a /users/:id', () => {
    let result: unknown;
    service.updateUser('user-1', { firstName: 'Actualizado' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/user-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ firstName: 'Actualizado' });
    req.flush({ message: 'ok', user: { ...user, firstName: 'Actualizado' } });

    expect((result as { user: UserBackend }).user.firstName).toBe('Actualizado');
  });

  it('deleteUser hace DELETE a /users/:id', () => {
    let result: { message: string } | undefined;
    service.deleteUser('user-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/user-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Usuario eliminado' });

    expect(result).toEqual({ message: 'Usuario eliminado' });
  });

  it('assignRoles hace POST a /users/:id/assign-roles con roleIds', () => {
    let result: unknown;
    service.assignRoles('user-1', ['role-1', 'role-2']).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/user-1/assign-roles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ roleIds: ['role-1', 'role-2'] });
    req.flush({ message: 'ok', user });

    expect(result).toEqual({ message: 'ok', user });
  });

  it('changePassword hace POST a /users/:id/change-password con newPassword', () => {
    let result: { message: string } | undefined;
    service.changePassword('user-1', 'NuevaPass1!').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/user-1/change-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ newPassword: 'NuevaPass1!' });
    req.flush({ message: 'Contraseña actualizada' });

    expect(result).toEqual({ message: 'Contraseña actualizada' });
  });

  it('toggleActive hace PATCH a /users/:id/toggle-active', () => {
    let result: unknown;
    service.toggleActive('user-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/user-1/toggle-active`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ message: 'ok', user: { ...user, isActive: false } });

    expect((result as { user: UserBackend }).user.isActive).toBe(false);
  });

  it('resendInvitation hace POST a /users/:id/resend-invitation', () => {
    let result: { message: string } | undefined;
    service.resendInvitation('user-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/user-1/resend-invitation`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Invitación reenviada' });

    expect(result).toEqual({ message: 'Invitación reenviada' });
  });

  it('disableTwoFactor hace POST a /users/:id/disable-2fa', () => {
    let result: { message: string } | undefined;
    service.disableTwoFactor('user-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/user-1/disable-2fa`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: '2FA desactivado' });

    expect(result).toEqual({ message: '2FA desactivado' });
  });
});
