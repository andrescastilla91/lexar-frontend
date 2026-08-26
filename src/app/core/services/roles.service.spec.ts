import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RolesService } from './roles.service';
import { Role } from '../models/role-backend.model';
import { environment } from '../../../environments/environment';

describe('RolesService', () => {
  let service: RolesService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/roles`;

  const role: Role = {
    id: 'role-1',
    name: 'Coordinador Legal',
    description: 'Gestiona procesos',
    isSystem: false,
    permissions: [{ id: 'perm-1', code: 'clients.view' }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(RolesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getRoles hace GET a /roles', () => {
    let result: unknown;
    service.getRoles().subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ roles: [role], total: 1 });

    expect(result).toEqual({ roles: [role], total: 1 });
  });

  it('getRoleById hace GET a /roles/:id', () => {
    let result: unknown;
    service.getRoleById('role-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/role-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ role });

    expect(result).toEqual({ role });
  });

  it('createRole hace POST con el payload', () => {
    let result: unknown;
    service.createRole({ name: 'Nuevo Rol' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Nuevo Rol' });
    req.flush({ role });

    expect(result).toEqual({ role });
  });

  it('updateRole hace PUT a /roles/:id', () => {
    let result: unknown;
    service.updateRole('role-1', { name: 'Actualizado' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/role-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Actualizado' });
    req.flush({ role: { ...role, name: 'Actualizado' } });

    expect((result as { role: Role }).role.name).toBe('Actualizado');
  });

  it('deleteRole hace DELETE a /roles/:id', () => {
    let result: { message: string } | undefined;
    service.deleteRole('role-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/role-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Rol eliminado' });

    expect(result).toEqual({ message: 'Rol eliminado' });
  });

  it('getAllPermissions hace GET a /roles/permissions', () => {
    service.getAllPermissions().subscribe();

    const req = httpMock.expectOne(`${apiUrl}/permissions`);
    expect(req.request.method).toBe('GET');
    req.flush({ permissions: [{ id: 'perm-1', code: 'clients.view' }], total: 1 });
  });

  it('assignPermissions hace POST a /roles/:id/permissions con permissionIds', () => {
    let result: unknown;
    service.assignPermissions('role-1', ['perm-1', 'perm-2']).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/role-1/permissions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ permissionIds: ['perm-1', 'perm-2'] });
    req.flush({ role });

    expect(result).toEqual({ role });
  });

  it('getRolePermissions hace GET a /roles/:id/permissions', () => {
    service.getRolePermissions('role-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/role-1/permissions`);
    expect(req.request.method).toBe('GET');
    req.flush({ permissions: [], total: 0 });
  });
});
