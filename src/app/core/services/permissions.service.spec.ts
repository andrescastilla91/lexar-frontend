import { TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { PermissionsService } from './permissions.service';
import { AuthService } from './auth.service';
import { AuthUser } from '../models/auth.model';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let currentUser: WritableSignal<AuthUser | null>;

  beforeEach(() => {
    currentUser = signal<AuthUser | null>(null);

    TestBed.configureTestingModule({
      providers: [PermissionsService, { provide: AuthService, useValue: { currentUser } }],
    });

    service = TestBed.inject(PermissionsService);
  });

  function setPermissions(permissions: string[]): void {
    currentUser.set({ email: 'user@lexar.com', roles: ['admin'], permissions });
  }

  it('no retorna permisos cuando no hay usuario autenticado', () => {
    expect(service.getAllPermissions()).toEqual([]);
  });

  it('hasPermission detecta un permiso presente', () => {
    setPermissions(['clients.view']);

    expect(service.hasPermission('clients.view')).toBe(true);
    expect(service.hasPermission('clients.delete')).toBe(false);
  });

  it('hasAnyPermission retorna true si al menos un permiso coincide', () => {
    setPermissions(['clients.view']);

    expect(service.hasAnyPermission(['clients.delete', 'clients.view'])).toBe(true);
    expect(service.hasAnyPermission(['users.list'])).toBe(false);
  });

  it('hasAllPermissions exige que todos los permisos estén presentes', () => {
    setPermissions(['clients.view', 'clients.edit']);

    expect(service.hasAllPermissions(['clients.view', 'clients.edit'])).toBe(true);
    expect(service.hasAllPermissions(['clients.view', 'clients.delete'])).toBe(false);
  });
});
