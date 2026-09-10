import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { UsersComponent } from './users.component';
import { UsersService } from '../../core/services/users.service';
import { RolesService } from '../../core/services/roles.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { UserBackend, UsersListResponse } from '../../core/models/user-backend.model';
import { RolesListResponse } from '../../core/models/role-backend.model';

function buildUser(overrides: Partial<UserBackend> = {}): UserBackend {
  return {
    id: 'u1',
    firstName: 'Ana',
    lastName: 'Gómez',
    email: 'ana@lexar.com',
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-01-01',
    twoFactorEnabled: false,
    roles: [],
    ...overrides,
  };
}

describe('UsersComponent', () => {
  let usersServiceMock: {
    getUsers: jest.Mock;
    getUserById: jest.Mock;
    createUser: jest.Mock;
    updateUser: jest.Mock;
    toggleActive: jest.Mock;
    resendInvitation: jest.Mock;
    disableTwoFactor: jest.Mock;
    assignRoles: jest.Mock;
  };
  let rolesServiceMock: { getRoles: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const usersResponse: UsersListResponse = {
    message: 'ok',
    users: [buildUser()],
    total: 1,
    page: 1,
    limit: 10,
  };

  const rolesResponse: RolesListResponse = {
    roles: [{ id: 'r1', name: 'Admin', isSystem: true }],
    total: 1,
  };

  function configure(): void {
    usersServiceMock = {
      getUsers: jest.fn().mockReturnValue(of(usersResponse)),
      getUserById: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      toggleActive: jest.fn(),
      resendInvitation: jest.fn(),
      disableTwoFactor: jest.fn(),
      assignRoles: jest.fn(),
    };
    rolesServiceMock = { getRoles: jest.fn().mockReturnValue(of(rolesResponse)) };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        { provide: UsersService, useValue: usersServiceMock },
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastServiceMock },
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
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('ngOnInit carga usuarios y roles disponibles', () => {
    configure();
    const { component } = createComponent();

    expect(usersServiceMock.getUsers).toHaveBeenCalledWith(1, 10);
    expect(component.users()).toEqual(usersResponse.users);
    expect(component.total()).toBe(1);
    expect(component.isLoading()).toBe(false);
    expect(component.availableRoles()).toEqual(rolesResponse.roles);
  });

  it('si getUsers falla, apaga isLoading sin lanzar', () => {
    configure();
    // BUG-20: el mock simula la forma real que arma error.interceptor.ts
    // ({message, statusCode, error}) — el componente lee error.message, no
    // error.error?.message.
    usersServiceMock.getUsers.mockReturnValue(throwError(() => ({ message: 'boom' })));
    const { component } = createComponent();

    expect(component.isLoading()).toBe(false);
    expect(component.users()).toEqual([]);
  });

  it('filteredUsers filtra por búsqueda y estado', () => {
    configure();
    const activeUser = buildUser({ id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com', isActive: true });
    const inactiveUser = buildUser({ id: 'u2', firstName: 'Luis', lastName: 'Pérez', email: 'luis@lexar.com', isActive: false });
    usersServiceMock.getUsers.mockReturnValue(of({ ...usersResponse, users: [activeUser, inactiveUser], total: 2 }));
    const { component } = createComponent();

    component.filterForm.patchValue({ search: 'luis' });
    expect(component.filteredUsers()).toEqual([inactiveUser]);

    component.filterForm.patchValue({ search: '', status: 'active' });
    expect(component.filteredUsers()).toEqual([activeUser]);

    component.filterForm.patchValue({ status: 'inactive' });
    expect(component.filteredUsers()).toEqual([inactiveUser]);
  });

  it('activeCount e inactiveCount reflejan el listado cargado', () => {
    configure();
    const activeUser = buildUser({ id: 'u1', isActive: true });
    const inactiveUser = buildUser({ id: 'u2', isActive: false });
    usersServiceMock.getUsers.mockReturnValue(of({ ...usersResponse, users: [activeUser, inactiveUser], total: 2 }));
    const { component } = createComponent();

    expect(component.activeCount()).toBe(1);
    expect(component.inactiveCount()).toBe(1);
  });

  it('togglePanel abre el panel y al cerrarlo limpia la edición', () => {
    configure();
    const { component } = createComponent();

    component.togglePanel();
    expect(component.panelOpen()).toBe(true);

    component.editingUser.set(buildUser());
    component.togglePanel();
    expect(component.panelOpen()).toBe(false);
    expect(component.editingUser()).toBeNull();
  });

  it('editUser con usuario que ya inició sesión deshabilita el email', () => {
    configure();
    const freshUser = buildUser({ lastLoginAt: '2026-01-05' });
    usersServiceMock.getUserById.mockReturnValue(of({ message: 'ok', user: freshUser }));
    const { component } = createComponent();

    component.editUser(buildUser());

    expect(component.editingUser()).toEqual(freshUser);
    expect(component.userForm.get('email')?.disabled).toBe(true);
    expect(component.panelOpen()).toBe(true);
  });

  it('editUser con usuario que nunca inició sesión permite editar el email', () => {
    configure();
    const freshUser = buildUser({ lastLoginAt: null });
    usersServiceMock.getUserById.mockReturnValue(of({ message: 'ok', user: freshUser }));
    const { component } = createComponent();

    component.editUser(buildUser());

    expect(component.userForm.get('email')?.disabled).toBe(false);
  });

  it('editUser en error muestra el toast con el mensaje del backend', () => {
    configure();
    usersServiceMock.getUserById.mockReturnValue(throwError(() => ({ message: 'Usuario no encontrado' })));
    const { component } = createComponent();

    component.editUser(buildUser());

    expect(toastServiceMock.error).toHaveBeenCalledWith('Usuario no encontrado');
  });

  it('submitUser no llama al servicio si el formulario es inválido', () => {
    configure();
    const { component } = createComponent();

    component.submitUser();

    expect(usersServiceMock.createUser).not.toHaveBeenCalled();
    expect(component.userForm.get('firstName')?.touched).toBe(true);
  });

  it('submitUser ignora llamadas repetidas mientras isSubmitting está activo', () => {
    configure();
    const { component } = createComponent();
    component.userForm.setValue({ firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' });
    component.isSubmitting.set(true);

    component.submitUser();

    expect(usersServiceMock.createUser).not.toHaveBeenCalled();
  });

  it('submitUser crea un usuario, notifica éxito y cierra el panel', () => {
    configure();
    usersServiceMock.createUser.mockReturnValue(of({ message: 'Invitación enviada', user: buildUser() }));
    const { component } = createComponent();

    component.userForm.setValue({ firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' });
    component.submitUser();

    expect(usersServiceMock.createUser).toHaveBeenCalledWith({ firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Invitación enviada');
    expect(component.panelOpen()).toBe(false);
    expect(component.isSubmitting()).toBe(false);
  });

  it('submitUser en error de creación expone el mensaje y no cierra el panel', () => {
    configure();
    usersServiceMock.createUser.mockReturnValue(throwError(() => ({ message: 'Email ya registrado' })));
    const { component } = createComponent();

    component.userForm.setValue({ firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' });
    component.togglePanel();
    component.submitUser();

    expect(component.errorMessage()).toBe('Email ya registrado');
    expect(toastServiceMock.error).toHaveBeenCalledWith('Email ya registrado');
    expect(component.isSubmitting()).toBe(false);
  });

  it('submitUser actualiza un usuario existente', () => {
    configure();
    const editing = buildUser({ id: 'u9' });
    usersServiceMock.updateUser.mockReturnValue(of({ message: 'ok', user: editing }));
    const { component } = createComponent();

    component.editingUser.set(editing);
    component.userForm.setValue({ firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' });
    component.submitUser();

    expect(usersServiceMock.updateUser).toHaveBeenCalledWith('u9', { firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Usuario actualizado exitosamente');
  });

  it('toggleUserStatus activa/desactiva tras confirmar', async () => {
    configure();
    usersServiceMock.toggleActive.mockReturnValue(of({ message: 'ok', user: buildUser() }));
    const { component } = createComponent();
    const user = buildUser({ isActive: true });

    await component.toggleUserStatus(user);

    expect(confirmDialogMock.confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    expect(usersServiceMock.toggleActive).toHaveBeenCalledWith(user.id);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Usuario desactivado exitosamente');
  });

  it('toggleUserStatus no llama al servicio si se cancela la confirmación', async () => {
    configure();
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.toggleUserStatus(buildUser());

    expect(usersServiceMock.toggleActive).not.toHaveBeenCalled();
  });

  it('toggleUserStatus en error notifica con el mensaje del backend', async () => {
    configure();
    usersServiceMock.toggleActive.mockReturnValue(throwError(() => ({ message: 'No autorizado' })));
    const { component } = createComponent();

    await component.toggleUserStatus(buildUser());

    expect(toastServiceMock.error).toHaveBeenCalledWith('No autorizado');
  });

  it('disableUserTwoFactor desactiva el 2FA tras confirmar', async () => {
    configure();
    usersServiceMock.disableTwoFactor.mockReturnValue(of({ message: 'ok' }));
    const { component } = createComponent();

    await component.disableUserTwoFactor(buildUser());

    expect(usersServiceMock.disableTwoFactor).toHaveBeenCalled();
    expect(toastServiceMock.success).toHaveBeenCalledWith('Verificación en dos pasos desactivada exitosamente');
  });

  it('disableUserTwoFactor no llama al servicio si se cancela', async () => {
    configure();
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.disableUserTwoFactor(buildUser());

    expect(usersServiceMock.disableTwoFactor).not.toHaveBeenCalled();
  });

  it('resendInvitation notifica éxito con el mensaje del backend', () => {
    configure();
    usersServiceMock.resendInvitation.mockReturnValue(of({ message: 'Invitación reenviada a ana@lexar.com' }));
    const { component } = createComponent();

    component.resendInvitation(buildUser());

    expect(toastServiceMock.success).toHaveBeenCalledWith('Invitación reenviada a ana@lexar.com');
  });

  it('resendInvitation en error notifica el mensaje del backend', () => {
    configure();
    usersServiceMock.resendInvitation.mockReturnValue(throwError(() => ({ message: 'Límite alcanzado' })));
    const { component } = createComponent();

    component.resendInvitation(buildUser());

    expect(toastServiceMock.error).toHaveBeenCalledWith('Límite alcanzado');
  });

  it('assignRoles abre el modal con los roles actuales del usuario', () => {
    configure();
    const { component } = createComponent();
    const user = buildUser({ roles: [{ id: 'r1', name: 'Admin' }] });

    component.assignRoles(user);

    expect(component.selectedUser()).toEqual(user);
    expect(component.selectedRoleIds()).toEqual(['r1']);
    expect(component.showRolesModal()).toBe(true);
  });

  it('saveRoles asigna los roles seleccionados y cierra el modal', () => {
    configure();
    usersServiceMock.assignRoles.mockReturnValue(of({ message: 'ok', user: buildUser() }));
    const { component } = createComponent();
    component.assignRoles(buildUser());

    component.saveRoles(['r1', 'r2']);

    expect(usersServiceMock.assignRoles).toHaveBeenCalledWith('u1', ['r1', 'r2']);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Roles asignados exitosamente');
    expect(component.showRolesModal()).toBe(false);
  });

  it('saveRoles no hace nada si no hay usuario seleccionado', () => {
    configure();
    const { component } = createComponent();

    component.saveRoles(['r1']);

    expect(usersServiceMock.assignRoles).not.toHaveBeenCalled();
  });

  it('saveRoles en error notifica y detiene isSubmitting', () => {
    configure();
    usersServiceMock.assignRoles.mockReturnValue(throwError(() => ({ message: 'Rol inválido' })));
    const { component } = createComponent();
    component.assignRoles(buildUser());

    component.saveRoles(['r1']);

    expect(toastServiceMock.error).toHaveBeenCalledWith('Rol inválido');
    expect(component.isSubmitting()).toBe(false);
  });

  it('nextPage avanza y recarga cuando hay más páginas', () => {
    configure();
    usersServiceMock.getUsers.mockReturnValue(of({ ...usersResponse, total: 25 }));
    const { component } = createComponent();

    component.nextPage();

    expect(component.currentPage()).toBe(2);
    expect(usersServiceMock.getUsers).toHaveBeenLastCalledWith(2, 10);
  });

  it('nextPage no avanza si ya está en la última página', () => {
    configure();
    const { component } = createComponent();

    component.nextPage();

    expect(component.currentPage()).toBe(1);
  });

  it('previousPage retrocede solo si no está en la primera página', () => {
    configure();
    usersServiceMock.getUsers.mockReturnValue(of({ ...usersResponse, total: 25 }));
    const { component } = createComponent();
    component.nextPage();

    component.previousPage();
    expect(component.currentPage()).toBe(1);

    component.previousPage();
    expect(component.currentPage()).toBe(1);
  });
});
