import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RolesTableComponent } from './roles-table.component';
import { PermissionsService } from '../../../core/services/permissions.service';
import { Role } from '../../../core/models/role-backend.model';

function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'r1',
    name: 'Coordinador Legal',
    description: 'Gestiona procesos',
    isSystem: false,
    permissions: [{ id: 'p1', code: 'clients.view' }],
    ...overrides,
  };
}

describe('RolesTableComponent', () => {
  function configure(permissions: string[]): void {
    TestBed.configureTestingModule({
      imports: [RolesTableComponent],
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

  function createComponent(roles: Role[] = [buildRole()], isLoading = false) {
    const fixture = TestBed.createComponent(RolesTableComponent);
    fixture.componentRef.setInput('roles', roles);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('muestra el spinner de carga cuando isLoading es true', () => {
    configure([]);
    const { fixture } = createComponent([], true);

    expect(fixture.nativeElement.querySelector('.animate-spin')).not.toBeNull();
  });

  it('muestra el mensaje vacío cuando no hay roles', () => {
    configure([]);
    const { fixture } = createComponent([]);

    expect(fixture.nativeElement.textContent).toContain('No se encontraron roles');
  });

  it('con todos los permisos, muestra editar, permisos y eliminar', () => {
    configure(['roles.edit', 'roles.assign-permissions', 'roles.delete']);
    const { fixture } = createComponent();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) =>
      (b as HTMLButtonElement).textContent?.trim(),
    );

    expect(buttons).toContain('Editar');
    expect(buttons).toContain('Permisos');
    expect(buttons).toContain('Eliminar');
  });

  it('sin permisos, oculta editar, permisos y eliminar', () => {
    configure([]);
    const { fixture } = createComponent();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) =>
      (b as HTMLButtonElement).textContent?.trim(),
    );

    expect(buttons).not.toContain('Editar');
    expect(buttons).not.toContain('Permisos');
    expect(buttons).not.toContain('Eliminar');
  });

  it('para un rol del sistema, deshabilita editar y eliminar aunque haya permiso', () => {
    configure(['roles.edit', 'roles.delete', 'roles.assign-permissions']);
    const systemRole = buildRole({ isSystem: true });
    const { fixture } = createComponent([systemRole]);

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const editButton = buttons.find((b) => b.textContent?.trim() === 'Editar')!;
    const deleteButton = buttons.find((b) => b.textContent?.trim() === 'Eliminar')!;

    expect(editButton.disabled).toBe(true);
    expect(deleteButton.disabled).toBe(true);
  });

  it('para un rol personalizado, editar y eliminar quedan habilitados', () => {
    configure(['roles.edit', 'roles.delete']);
    const { fixture } = createComponent([buildRole({ isSystem: false })]);

    const editButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Editar',
    ) as HTMLButtonElement;

    expect(editButton.disabled).toBe(false);
  });

  it('muestra la etiqueta "Sistema" solo para roles del sistema', () => {
    configure([]);
    const { fixture } = createComponent([buildRole({ isSystem: true })]);

    expect(fixture.nativeElement.textContent).toContain('Sistema');
  });

  it('emite managePermissions al hacer click en Permisos', () => {
    configure(['roles.assign-permissions']);
    const role = buildRole();
    const { fixture, component } = createComponent([role]);
    const spy = jest.fn();
    component.managePermissions.subscribe(spy);

    const permisosButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Permisos',
    ) as HTMLButtonElement;
    permisosButton.click();

    expect(spy).toHaveBeenCalledWith(role);
  });

  it('emite delete al hacer click en Eliminar', () => {
    configure(['roles.delete']);
    const role = buildRole();
    const { fixture, component } = createComponent([role]);
    const spy = jest.fn();
    component.delete.subscribe(spy);

    const deleteButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Eliminar',
    ) as HTMLButtonElement;
    deleteButton.click();

    expect(spy).toHaveBeenCalledWith(role);
  });
});
