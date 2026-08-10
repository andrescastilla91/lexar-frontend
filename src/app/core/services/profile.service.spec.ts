import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';
import { ProfileUser } from '../models/profile.model';
import { environment } from '../../../environments/environment';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/users/me`;

  const user: ProfileUser = {
    id: '1',
    firstName: 'Ana',
    lastName: 'Gómez',
    email: 'ana@lexar.com',
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    phone: null,
    themePreference: 'system',
    avatarUrl: null,
    roles: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getMe extrae el usuario de la respuesta', () => {
    let result: ProfileUser | undefined;
    service.getMe().subscribe((u) => (result = u));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', user });

    expect(result).toEqual(user);
  });

  it('updateMe envía PATCH con el cuerpo dado', () => {
    let result: ProfileUser | undefined;
    service.updateMe({ firstName: 'Nuevo' }).subscribe((u) => (result = u));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ firstName: 'Nuevo' });
    req.flush({ message: 'ok', user: { ...user, firstName: 'Nuevo' } });

    expect(result?.firstName).toBe('Nuevo');
  });

  it('changePassword hace POST a /change-password', () => {
    service.changePassword({ currentPassword: 'a', newPassword: 'b12345678' }).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/change-password`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok' });
  });

  it('getSessions extrae la lista de sesiones', () => {
    let result: unknown;
    service.getSessions().subscribe((s) => (result = s));

    const req = httpMock.expectOne(`${apiUrl}/sessions`);
    expect(req.request.method).toBe('GET');
    req.flush({
      message: 'ok',
      sessions: [{ id: 's1', userAgent: null, ip: null, createdAt: '2026-01-01', current: true }],
    });

    expect(result).toEqual([{ id: 's1', userAgent: null, ip: null, createdAt: '2026-01-01', current: true }]);
  });

  it('revokeSession hace DELETE a la sesión indicada', () => {
    service.revokeSession('s1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/sessions/s1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok' });
  });
});
