import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AssignRolesModalComponent } from './assign-roles-modal.component';
import { RolesService } from '../../../core/services/roles.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ToastService } from '../../../core/services/toast.service';
import { Role } from '../../../core/models/role-backend.model';

const ROLES: Role[] = [
  { id: 'r1', name: 'Admin', isSystem: true },
  { id: 'r2', name: 'Asesor', isSystem: false },
];

describe('AssignRolesModalComponent', () => {
  let rolesServiceMock: { createRole: jest.Mock };
  let toastMock: { success: jest.Mock; error: jest.Mock };

  function configure(userPermissions: string[]): void {
    rolesServiceMock = { createRole: jest.fn() };
    toastMock = { success: jest.fn(), error: jest.fn() };
    TestBed.configureTestingModule({
      imports: [AssignRolesModalComponent],
      providers: [
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: PermissionsService, useValue: { userPermissions: signal(userPermissions) } },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AssignRolesModalComponent);
    fixture.componentRef.setInput('roles', ROLES);
    fixture.componentRef.setInput('selectedIds', ['r1']);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  function findButton(root: HTMLElement, text: string): HTMLButtonElement | undefined {
    return Array.from(root.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === text,
    ) as HTMLButtonElement | undefined;
  }

  it('con roles.create ofrece "Crear rol nuevo"; sin él no', () => {
    configure(['roles.create']);
    const withPerm = createComponent();
    expect(findButton(withPerm.fixture.nativeElement as HTMLElement, 'Crear rol nuevo')).toBeDefined();
    TestBed.resetTestingModule();

    configure(['users.assign-roles']);
    const withoutPerm = createComponent();
    expect(withoutPerm.component.canCreateRole()).toBe(false);
    expect(findButton(withoutPerm.fixture.nativeElement as HTMLElement, 'Crear rol nuevo')).toBeUndefined();
  });

  it('crear rol: lo crea, avisa al padre, lo preselecciona y conserva lo ya marcado, sin guardar la asignación', () => {
    configure(['roles.create']);
    const created: Role = { id: 'r3', name: 'Coordinador', isSystem: false };
    rolesServiceMock.createRole.mockReturnValue(of({ message: 'ok', role: created }));
    const { fixture, component } = createComponent();
    const roleCreated: Role[] = [];
    const saved: string[][] = [];
    component.roleCreated.subscribe((r) => roleCreated.push(r));
    component.save.subscribe((ids) => saved.push(ids));

    component.openCreateForm(['r1', 'r2']);
    expect(component.showCreateForm()).toBe(true);
    component.roleForm.patchValue({ name: 'Coordinador', description: 'Coordina' });
    component.submitCreate();
    fixture.componentRef.setInput('roles', [...ROLES, created]);
    fixture.detectChanges();

    expect(rolesServiceMock.createRole).toHaveBeenCalledWith({ name: 'Coordinador', description: 'Coordina' });
    expect(roleCreated).toEqual([created]);
    expect(component.showCreateForm()).toBe(false);
    expect(component.effectiveSelectedIds()).toEqual(['r1', 'r2', 'r3']);
    expect(saved).toEqual([]);
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('crear rol con nombre inválido no llama al servicio', () => {
    configure(['roles.create']);
    const { component } = createComponent();

    component.openCreateForm(['r1']);
    component.roleForm.patchValue({ name: 'ab' });
    component.submitCreate();

    expect(rolesServiceMock.createRole).not.toHaveBeenCalled();
    expect(component.showCreateForm()).toBe(true);
  });

  it('si crear falla, muestra el error en el formulario y conserva la selección', () => {
    configure(['roles.create']);
    rolesServiceMock.createRole.mockReturnValue(throwError(() => ({ message: 'Ya existe un rol con ese nombre' })));
    const { component } = createComponent();

    component.openCreateForm(['r1', 'r2']);
    component.roleForm.patchValue({ name: 'Asesor' });
    component.submitCreate();

    expect(component.createError()).toBe('Ya existe un rol con ese nombre');
    expect(component.showCreateForm()).toBe(true);
    expect(component.isCreating()).toBe(false);
    expect(component.effectiveSelectedIds()).toEqual(['r1', 'r2']);
  });

  it('cancelar la creación cierra el formulario y deja la selección que se había marcado', () => {
    configure(['roles.create']);
    const { component } = createComponent();

    component.openCreateForm(['r1', 'r2']);
    component.closeCreateForm();

    expect(component.showCreateForm()).toBe(false);
    expect(component.effectiveSelectedIds()).toEqual(['r1', 'r2']);
  });

  it('al cerrar el modal se descarta la selección pendiente', () => {
    configure(['roles.create']);
    const { fixture, component } = createComponent();
    component.openCreateForm(['r1', 'r2']);

    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    expect(component.effectiveSelectedIds()).toEqual(['r1']);
    expect(component.showCreateForm()).toBe(false);
  });
});
