import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UsersTableComponent } from './users-table.component';
import { PermissionsService } from '../../../core/services/permissions.service';
import { UserBackend } from '../../../core/models/user-backend.model';

function buildUser(overrides: Partial<UserBackend> = {}): UserBackend {
  return {
    id: 'u1',
    firstName: 'Ana',
    lastName: 'Gómez',
    email: 'ana@lexar.com',
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-01-01',
    twoFactorEnabled: true,
    roles: [{ id: 'r1', name: 'Admin' }],
    ...overrides,
  };
}

describe('UsersTableComponent', () => {
  function configure(permissions: string[]): void {
    TestBed.configureTestingModule({
      imports: [UsersTableComponent],
      providers: [
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn((perms: string[]) => perms.some((p) => permissions.includes(p))),
            hasPermission: jest.fn((perm: string) => permissions.includes(perm)),
            userPermissions: signal(permissions),
          },
        },
      ],
    });
  }

  function createComponent(users: UserBackend[] = [buildUser()], isLoading = false) {
    const fixture = TestBed.createComponent(UsersTableComponent);
    fixture.componentRef.setInput('users', users);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('muestra el spinner de carga cuando isLoading es true', () => {
    configure([]);
    const { fixture } = createComponent([], true);

    expect(fixture.nativeElement.querySelector('.animate-spin')).not.toBeNull();
  });

  it('muestra el mensaje vacío cuando no hay usuarios', () => {
    configure([]);
    const { fixture } = createComponent([]);

    expect(fixture.nativeElement.textContent).toContain('No se encontraron usuarios');
  });

  it('con todos los permisos, muestra las acciones de editar, estado, roles y 2FA', () => {
    configure(['users.edit', 'users.activate', 'users.deactivate', 'users.assign-roles', 'users.manage-2fa', 'users.create']);
    const { fixture } = createComponent();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);

    expect(titles).toContain('Editar');
    expect(titles).toContain('Asignar roles');
    expect(titles).toContain('Desactivar usuario');
    expect(titles).toContain('Desactivar verificación en dos pasos');
  });

  it('sin permisos, oculta todas las acciones de la tabla', () => {
    configure([]);
    const { fixture } = createComponent();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);

    expect(titles).not.toContain('Editar');
    expect(titles).not.toContain('Asignar roles');
    expect(titles).not.toContain('Desactivar usuario');
    expect(titles).not.toContain('Desactivar verificación en dos pasos');
  });

  it('sin el permiso users.create, oculta reenviar invitación aunque esté pendiente', () => {
    configure(['users.edit']);
    const pendingUser = buildUser({ invitationStatus: 'PENDING' });
    const { fixture } = createComponent([pendingUser]);

    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);
    expect(titles).not.toContain('Reenviar invitación');
  });

  it('con el permiso users.create y una invitación pendiente, muestra reenviar invitación', () => {
    configure(['users.create']);
    const pendingUser = buildUser({ invitationStatus: 'PENDING' });
    const { fixture } = createComponent([pendingUser]);

    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);
    expect(titles).toContain('Reenviar invitación');
  });

  it('emite edit al hacer click en editar con permiso', () => {
    configure(['users.edit']);
    const user = buildUser();
    const { fixture, component } = createComponent([user]);
    const editSpy = jest.fn();
    component.edit.subscribe(editSpy);

    const editButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).title === 'Editar',
    ) as HTMLButtonElement;
    editButton.click();

    expect(editSpy).toHaveBeenCalledWith(user);
  });

  it('getUserInitials devuelve las iniciales en mayúscula', () => {
    configure([]);
    const { component } = createComponent();

    expect(component.getUserInitials(buildUser({ firstName: 'ana', lastName: 'gómez' }))).toBe('AG');
  });
});
