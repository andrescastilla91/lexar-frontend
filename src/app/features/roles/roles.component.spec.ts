import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { RolesComponent } from './roles.component';
import { RolesService } from '../../core/services/roles.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { ToastService } from '../../core/services/toast.service';
import { Role, RolesListResponse, PermissionsListResponse } from '../../core/models/role-backend.model';

function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'r1',
    name: 'Coordinador Legal',
    description: 'Gestiona procesos',
    isSystem: false,
    permissions: [],
    ...overrides,
  };
}

describe('RolesComponent', () => {
  let rolesServiceMock: {
    getRoles: jest.Mock;
    getAllPermissions: jest.Mock;
    createRole: jest.Mock;
    updateRole: jest.Mock;
    deleteRole: jest.Mock;
    getRolePermissions: jest.Mock;
    assignPermissions: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { error: jest.Mock; success: jest.Mock };

  const rolesResponse: RolesListResponse = { roles: [buildRole()], total: 1 };
  const permissionsResponse: PermissionsListResponse = {
    permissions: [{ id: 'p1', code: 'clients.view', description: 'Ver clientes' }],
    total: 1,
  };

  function configure(): void {
    rolesServiceMock = {
      getRoles: jest.fn().mockReturnValue(of(rolesResponse)),
      getAllPermissions: jest.fn().mockReturnValue(of(permissionsResponse)),
      createRole: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
      getRolePermissions: jest.fn(),
      assignPermissions: jest.fn(),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastMock = { error: jest.fn(), success: jest.fn() };

    TestBed.configureTestingModule({
      imports: [RolesComponent],
      providers: [
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal<string[]>([]),
          },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(RolesComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('ngOnInit carga roles y el catálogo de permisos', () => {
    configure();
    const { component } = createComponent();

    expect(component.roles()).toEqual(rolesResponse.roles);
    expect(component.allPermissions()).toEqual(permissionsResponse.permissions);
    expect(component.isLoading()).toBe(false);
  });

  it('si getRoles falla, apaga isLoading sin lanzar', () => {
    configure();
    rolesServiceMock.getRoles.mockReturnValue(throwError(() => new Error('boom')));
    const { component } = createComponent();

    expect(component.isLoading()).toBe(false);
    expect(component.roles()).toEqual([]);
  });

  it('systemRolesCount y customRolesCount cuentan según isSystem', () => {
    configure();
    rolesServiceMock.getRoles.mockReturnValue(
      of({ roles: [buildRole({ id: 'r1', isSystem: true }), buildRole({ id: 'r2', isSystem: false })], total: 2 }),
    );
    const { component } = createComponent();

    expect(component.systemRolesCount()).toBe(1);
    expect(component.customRolesCount()).toBe(1);
  });

  it('permissionCatalogItems agrupa por el prefijo del código de permiso', () => {
    configure();
    rolesServiceMock.getAllPermissions.mockReturnValue(
      of({
        permissions: [
          { id: 'p1', code: 'clients.view' },
          { id: 'p2', code: 'general-permission' },
        ],
        total: 2,
      }),
    );
    const { component } = createComponent();

    expect(component.permissionCatalogItems()).toEqual([
      { id: 'p1', label: 'clients.view', description: undefined, group: 'clients' },
      { id: 'p2', label: 'general-permission', description: undefined, group: 'General' },
    ]);
  });

  it('togglePanel abre el panel y al cerrarlo limpia la edición', () => {
    configure();
    const { component } = createComponent();

    component.togglePanel();
    expect(component.panelOpen()).toBe(true);

    component.editingRole.set(buildRole());
    component.togglePanel();
    expect(component.panelOpen()).toBe(false);
    expect(component.editingRole()).toBeNull();
  });

  it('editRole precarga el formulario con los datos del rol', () => {
    configure();
    const { component } = createComponent();
    const role = buildRole({ description: undefined });

    component.editRole(role);

    expect(component.editingRole()).toEqual(role);
    expect(component.roleForm.value).toEqual({ name: role.name, description: '' });
    expect(component.panelOpen()).toBe(true);
  });

  it('submitRole no llama al servicio si el formulario es inválido', () => {
    configure();
    const { component } = createComponent();

    component.submitRole();

    expect(rolesServiceMock.createRole).not.toHaveBeenCalled();
    expect(component.roleForm.get('name')?.touched).toBe(true);
  });

  it('submitRole ignora llamadas repetidas mientras isSubmitting está activo', () => {
    configure();
    const { component } = createComponent();
    component.roleForm.setValue({ name: 'Coordinador Legal', description: '' });
    component.isSubmitting.set(true);

    component.submitRole();

    expect(rolesServiceMock.createRole).not.toHaveBeenCalled();
  });

  it('submitRole crea un rol y cierra el panel', () => {
    configure();
    rolesServiceMock.createRole.mockReturnValue(of({ role: buildRole() }));
    const { component } = createComponent();

    component.roleForm.setValue({ name: 'Coordinador Legal', description: 'Gestiona procesos' });
    component.submitRole();

    expect(rolesServiceMock.createRole).toHaveBeenCalledWith({ name: 'Coordinador Legal', description: 'Gestiona procesos' });
    expect(component.panelOpen()).toBe(false);
    expect(component.isSubmitting()).toBe(false);
  });

  it('submitRole en error de creación expone el mensaje', () => {
    configure();
    rolesServiceMock.createRole.mockReturnValue(throwError(() => ({ message: 'Ya existe un rol con ese nombre' })));
    const { component } = createComponent();

    component.roleForm.setValue({ name: 'Coordinador Legal', description: '' });
    component.submitRole();

    expect(component.errorMessage()).toBe('Ya existe un rol con ese nombre');
    expect(component.isSubmitting()).toBe(false);
  });

  // BUG-19: el bug real vivía en error.interceptor.ts (pisaba el mensaje con
  // el genérico "No tienes permisos..." para todo 403, ver
  // error.interceptor.spec.ts) — createRole ya leía error.message
  // correctamente, solo recibía el valor equivocado. Este caso deja
  // constancia de que, con un error que trae `code` (la forma real que ya
  // manda el interceptor corregido para un gate de plan o de permisos),
  // el componente sigue mostrando el mensaje real sin genericizarlo por su
  // cuenta.
  it('submitRole en un 403 con mensaje real (code SUBSCRIPTION_SUSPENDED) expone ese mensaje, no un genérico', () => {
    configure();
    rolesServiceMock.createRole.mockReturnValue(
      throwError(() => ({
        message: 'Tu suscripción está suspendida. Actualiza tu plan para seguir editando.',
        statusCode: 403,
        error: { code: 'SUBSCRIPTION_SUSPENDED' },
      })),
    );
    const { component } = createComponent();

    component.roleForm.setValue({ name: 'Coordinador Legal', description: '' });
    component.submitRole();

    expect(component.errorMessage()).toBe('Tu suscripción está suspendida. Actualiza tu plan para seguir editando.');
  });

  it('submitRole actualiza un rol existente', () => {
    configure();
    const editing = buildRole({ id: 'r9' });
    rolesServiceMock.updateRole.mockReturnValue(of({ role: editing }));
    const { component } = createComponent();

    component.editingRole.set(editing);
    component.roleForm.setValue({ name: 'Coordinador Legal', description: 'Gestiona procesos' });
    component.submitRole();

    expect(rolesServiceMock.updateRole).toHaveBeenCalledWith('r9', { name: 'Coordinador Legal', description: 'Gestiona procesos' });
  });

  it('deleteRole elimina tras confirmar', async () => {
    configure();
    rolesServiceMock.deleteRole.mockReturnValue(of({ message: 'ok' }));
    const { component } = createComponent();
    const role = buildRole();

    await component.deleteRole(role);

    expect(confirmDialogMock.confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    expect(rolesServiceMock.deleteRole).toHaveBeenCalledWith(role.id);
  });

  it('deleteRole no llama al servicio si se cancela la confirmación', async () => {
    configure();
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.deleteRole(buildRole());

    expect(rolesServiceMock.deleteRole).not.toHaveBeenCalled();
  });

  it('deleteRole en error, muestra un toast con el mensaje real (BUG-20: ya no usa alert nativo)', async () => {
    configure();
    rolesServiceMock.deleteRole.mockReturnValue(throwError(() => ({ message: 'No se puede eliminar un rol en uso' })));
    const { component } = createComponent();

    await component.deleteRole(buildRole());

    expect(toastMock.error).toHaveBeenCalledWith('No se puede eliminar un rol en uso');
  });

  it('managePermissions abre el modal con los permisos actuales del rol', () => {
    configure();
    rolesServiceMock.getRolePermissions.mockReturnValue(of({ permissions: [{ id: 'p1', code: 'clients.view' }], total: 1 }));
    const { component } = createComponent();
    const role = buildRole();

    component.managePermissions(role);

    expect(component.selectedRole()).toEqual(role);
    expect(component.selectedPermissionIds()).toEqual(['p1']);
    expect(component.showPermissionsModal()).toBe(true);
  });

  it('managePermissions en error, muestra un toast (BUG-20: ya no usa alert nativo)', () => {
    configure();
    rolesServiceMock.getRolePermissions.mockReturnValue(throwError(() => ({ message: 'No se pudieron cargar los permisos' })));
    const { component } = createComponent();

    component.managePermissions(buildRole());

    expect(toastMock.error).toHaveBeenCalledWith('No se pudieron cargar los permisos');
    expect(component.showPermissionsModal()).toBe(false);
  });

  it('closePermissionsModal limpia el rol y los permisos seleccionados', () => {
    configure();
    rolesServiceMock.getRolePermissions.mockReturnValue(of({ permissions: [{ id: 'p1', code: 'clients.view' }], total: 1 }));
    const { component } = createComponent();
    component.managePermissions(buildRole());

    component.closePermissionsModal();

    expect(component.showPermissionsModal()).toBe(false);
    expect(component.selectedRole()).toBeNull();
    expect(component.selectedPermissionIds()).toEqual([]);
  });

  it('savePermissions asigna los permisos seleccionados y cierra el modal', () => {
    configure();
    rolesServiceMock.getRolePermissions.mockReturnValue(of({ permissions: [], total: 0 }));
    rolesServiceMock.assignPermissions.mockReturnValue(of({ role: buildRole() }));
    const { component } = createComponent();
    component.managePermissions(buildRole());

    component.savePermissions(['p1', 'p2']);

    expect(rolesServiceMock.assignPermissions).toHaveBeenCalledWith('r1', ['p1', 'p2']);
    expect(component.showPermissionsModal()).toBe(false);
  });

  it('savePermissions no hace nada si no hay rol seleccionado', () => {
    configure();
    const { component } = createComponent();

    component.savePermissions(['p1']);

    expect(rolesServiceMock.assignPermissions).not.toHaveBeenCalled();
  });

  it('savePermissions en error, muestra un toast y detiene isSubmitting (BUG-20: ya no usa alert nativo)', () => {
    configure();
    rolesServiceMock.getRolePermissions.mockReturnValue(of({ permissions: [], total: 0 }));
    rolesServiceMock.assignPermissions.mockReturnValue(throwError(() => ({ message: 'Permiso inválido' })));
    const { component } = createComponent();
    component.managePermissions(buildRole());

    component.savePermissions(['p1']);

    expect(toastMock.error).toHaveBeenCalledWith('Permiso inválido');
    expect(component.isSubmitting()).toBe(false);
  });
});
