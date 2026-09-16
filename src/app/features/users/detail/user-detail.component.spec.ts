import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { UserDetailComponent } from './user-detail.component';
import { UsersService } from '../../../core/services/users.service';
import { RolesService } from '../../../core/services/roles.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { UserBackend } from '../../../core/models/user-backend.model';
import { Permission, Role } from '../../../core/models/role-backend.model';

function buildRole(overrides: Partial<Role> = {}): Role {
  return { id: 'r1', name: 'Admin', description: 'Rol admin', isSystem: true, ...overrides };
}

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
    roles: [{ id: 'r1', name: 'Admin' }],
    isAdvisor: false,
    advisorProfile: null,
    ...overrides,
  };
}

function buildPermission(overrides: Partial<Permission> = {}): Permission {
  return {
    id: 'p1',
    code: 'clients.view',
    description: 'Ver clientes',
    label: 'Ver clientes',
    groupCode: 'clients',
    groupLabel: 'Clientes',
    groupDescription: null,
    ...overrides,
  };
}

describe('UserDetailComponent', () => {
  let usersServiceMock: {
    getUserById: jest.Mock;
    updateUser: jest.Mock;
    resendInvitation: jest.Mock;
    assignRoles: jest.Mock;
  };
  let rolesServiceMock: { getRolePermissions: jest.Mock; getRoles: jest.Mock };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let confirmDialogServiceMock: { confirm: jest.Mock };

  function configureAndCreate(overrides: {
    routeId?: string | null;
    getUserResult?: unknown;
    permissions?: string[];
    rolePermissionsImpl?: (roleId: string) => unknown;
    getRolesResult?: unknown;
  } = {}) {
    const routeId = overrides.routeId === undefined ? 'u1' : overrides.routeId;
    // Fix 2026-09-15: el mock de hasAnyPermission ahora respeta esta lista
    // de verdad (antes siempre devolvía true) — se agrega 'users.create'
    // porque el test del botón "Reenviar invitación" espera verlo con los
    // permisos por defecto, sin pasar override.
    const grantedPermissions =
      overrides.permissions ?? ['users.edit', 'users.assign-roles', 'users.create'];

    usersServiceMock = {
      getUserById: jest.fn().mockReturnValue(overrides.getUserResult ?? of({ message: 'ok', user: buildUser() })),
      updateUser: jest.fn().mockReturnValue(of({ message: 'ok', user: buildUser() })),
      resendInvitation: jest.fn().mockReturnValue(of({ message: 'ok' })),
      assignRoles: jest.fn().mockReturnValue(of({ message: 'ok', user: buildUser() })),
    };
    rolesServiceMock = {
      getRolePermissions: jest.fn(
        overrides.rolePermissionsImpl ??
          (() => of({ permissions: [buildPermission()], total: 1 })),
      ),
      getRoles: jest.fn().mockReturnValue(overrides.getRolesResult ?? of({ roles: [buildRole()], total: 1 })),
    };
    catalogsServiceMock = { getActiveCatalog: jest.fn().mockReturnValue(of([])) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    // BUG (2026-09-15): por defecto resuelve `true` (usuario acepta) — así
    // los tests que no tienen que ver con la advertencia de "quitar asesor"
    // no se ven afectados.
    confirmDialogServiceMock = { confirm: jest.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [UserDetailComponent],
      providers: [
        provideRouter([]),
        { provide: UsersService, useValue: usersServiceMock },
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
        {
          provide: PermissionsService,
          useValue: {
            // Fix 2026-09-15: quedó fijo en `true` sin importar `permissions`
            // (bug de la mock, no del componente) — el directive real
            // `*hasPermission` llama `hasAnyPermission`, así que el mock debe
            // respetar `grantedPermissions` igual que `hasPermission`.
            hasAnyPermission: jest.fn((codes: string[]) =>
              codes.some((code) => grantedPermissions.includes(code)),
            ),
            hasPermission: jest.fn((code: string) => grantedPermissions.includes(code)),
            userPermissions: signal(grantedPermissions),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(UserDetailComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('sin id en la ruta, no carga nada y deja isLoading en false', () => {
    const { component } = configureAndCreate({ routeId: null });

    expect(component.isLoading()).toBe(false);
    expect(component.user()).toBeNull();
    expect(usersServiceMock.getUserById).not.toHaveBeenCalled();
  });

  it('carga el usuario y precarga el formulario', () => {
    const { component } = configureAndCreate({
      getUserResult: of({
        message: 'ok',
        user: buildUser({
          isAdvisor: true,
          advisorProfile: {
            specialties: [{ id: 'sp1', code: 'civil', label: 'Derecho civil', color: null }],
            advisorPhone: '3000000000',
            professionalCard: 'TP-123',
            mobileSecondary: null,
            experienceYears: 4,
          },
        }),
      }),
    });

    expect(component.editForm.get('isAdvisor')?.value).toBe(true);
    expect(component.editForm.get('specialtyIds')?.value).toEqual(['sp1']);
    expect(component.editForm.get('advisorPhone')?.value).toBe('3000000000');
    expect(component.editForm.get('experienceYears')?.value).toBe(4);
  });

  it('si falla la carga del usuario, deja user() en null y isLoading en false', () => {
    const { component } = configureAndCreate({ getUserResult: throwError(() => new Error('boom')) });

    expect(component.user()).toBeNull();
    expect(component.isLoading()).toBe(false);
  });

  it('incluye las 3 pestañas del rediseño F35', () => {
    const { component } = configureAndCreate();

    expect(component.tabs.map((t) => t.id)).toEqual(['cuenta', 'perfil', 'permisos']);
  });

  it('agrupa los permisos por rol y por groupLabel', () => {
    const { component } = configureAndCreate({
      rolePermissionsImpl: () =>
        of({
          permissions: [
            buildPermission({ id: 'p1', groupLabel: 'Clientes' }),
            buildPermission({ id: 'p2', groupLabel: 'Procesos', label: 'Ver procesos', code: 'processes.view' }),
            buildPermission({ id: 'p3', groupLabel: 'Clientes', label: 'Editar clientes', code: 'clients.edit' }),
          ],
          total: 3,
        }),
    });

    expect(component.isLoadingPermissions()).toBe(false);
    expect(component.roleSections()).toEqual([
      {
        role: { id: 'r1', name: 'Admin' },
        groups: [
          {
            groupLabel: 'Clientes',
            groupDescription: null,
            permissions: [
              buildPermission({ id: 'p1', groupLabel: 'Clientes' }),
              buildPermission({ id: 'p3', groupLabel: 'Clientes', label: 'Editar clientes', code: 'clients.edit' }),
            ],
          },
          {
            groupLabel: 'Procesos',
            groupDescription: null,
            permissions: [
              buildPermission({ id: 'p2', groupLabel: 'Procesos', label: 'Ver procesos', code: 'processes.view' }),
            ],
          },
        ],
      },
    ]);
  });

  it('sin roles asignados, roleSections queda vacío sin llamar al servicio', () => {
    const { component } = configureAndCreate({
      getUserResult: of({ message: 'ok', user: buildUser({ roles: [] }) }),
    });

    expect(component.roleSections()).toEqual([]);
    expect(rolesServiceMock.getRolePermissions).not.toHaveBeenCalled();
  });

  it('si falla la carga de permisos de un rol, ese rol queda con groups vacío', () => {
    const { component } = configureAndCreate({
      rolePermissionsImpl: () => throwError(() => new Error('boom')),
    });

    expect(component.roleSections()).toEqual([{ role: { id: 'r1', name: 'Admin' }, groups: [] }]);
    expect(component.isLoadingPermissions()).toBe(false);
  });

  it('deshabilita los campos y muestra aviso cuando falta users.edit', () => {
    const { fixture, component } = configureAndCreate({ permissions: [] });

    fixture.detectChanges();

    expect(component.canEdit()).toBe(false);
    const firstNameInput = fixture.nativeElement.querySelector(
      'input[formcontrolname="firstName"]',
    ) as HTMLInputElement;
    expect(firstNameInput.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No tienes permiso para editar los datos de este usuario.');
  });

  it('bloquea el email cuando el usuario ya inició sesión, aun con permiso', () => {
    const { fixture, component } = configureAndCreate({
      getUserResult: of({ message: 'ok', user: buildUser({ lastLoginAt: '2026-01-05' }) }),
    });
    fixture.detectChanges();

    expect(component.editForm.get('email')?.disabled).toBe(true);
  });

  it('permite editar el email si el usuario nunca inició sesión y hay permiso', () => {
    const { fixture, component } = configureAndCreate({
      getUserResult: of({ message: 'ok', user: buildUser({ lastLoginAt: null }) }),
    });
    fixture.detectChanges();

    expect(component.editForm.get('email')?.disabled).toBe(false);
  });

  it('saveUser inválido avisa por toast y salta a la pestaña "cuenta"', () => {
    const { component } = configureAndCreate();

    component.activeTab.set('perfil');
    component.editForm.patchValue({ firstName: '' });
    component.saveUser();

    expect(toastServiceMock.error).toHaveBeenCalledWith(
      'Hay campos obligatorios sin completar en la pestaña Datos de la cuenta',
    );
    expect(component.activeTab()).toBe('cuenta');
    expect(usersServiceMock.updateUser).not.toHaveBeenCalled();
  });

  it('saveUser actualiza el usuario y notifica éxito', () => {
    const updated = buildUser({ firstName: 'Ana María' });
    const { component } = configureAndCreate();
    usersServiceMock.updateUser.mockReturnValue(of({ message: 'ok', user: updated }));

    component.saveUser();

    expect(usersServiceMock.updateUser).toHaveBeenCalledWith('u1', {
      firstName: 'Ana',
      lastName: 'Gómez',
      email: 'ana@lexar.com',
      isAdvisor: false,
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Usuario actualizado exitosamente');
    expect(component.user()).toEqual(updated);
  });

  it('saveUser incluye el perfil profesional cuando isAdvisor está marcado', () => {
    const { component } = configureAndCreate();

    component.editForm.patchValue({
      isAdvisor: true,
      specialtyIds: ['sp1'],
      advisorPhone: '3000000000',
      professionalCard: 'TP-123',
      mobileSecondary: '3111111111',
      experienceYears: 5,
    });
    component.saveUser();

    expect(usersServiceMock.updateUser).toHaveBeenCalledWith('u1', {
      firstName: 'Ana',
      lastName: 'Gómez',
      email: 'ana@lexar.com',
      isAdvisor: true,
      specialtyIds: ['sp1'],
      advisorPhone: '3000000000',
      professionalCard: 'TP-123',
      mobileSecondary: '3111111111',
      experienceYears: 5,
    });
  });

  it('saveUser en error expone el mensaje por toast', () => {
    const { component } = configureAndCreate();
    usersServiceMock.updateUser.mockReturnValue(throwError(() => ({ message: 'Email ya registrado' })));

    component.saveUser();

    expect(component.errorMessage()).toBe('Email ya registrado');
    expect(toastServiceMock.error).toHaveBeenCalledWith('Email ya registrado');
    expect(component.isSaving()).toBe(false);
  });

  it('saveUser no hace nada si ya está guardando o no hay usuario cargado', () => {
    const { component } = configureAndCreate();
    component.isSaving.set(true);

    component.saveUser();

    expect(usersServiceMock.updateUser).not.toHaveBeenCalled();
  });

  // BUG (2026-09-15): reporte real — quitar el perfil de asesor de un
  // usuario asignado a un proceso activo no mostraba ninguna advertencia.
  it('saveUser pide confirmación antes de destildar "Es asesor legal" (true→false) y continúa si se acepta', async () => {
    const { component } = configureAndCreate({
      getUserResult: of({ message: 'ok', user: buildUser({ isAdvisor: true }) }),
    });
    confirmDialogServiceMock.confirm.mockResolvedValue(true);

    component.editForm.patchValue({ isAdvisor: false });
    await component.saveUser();

    expect(confirmDialogServiceMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ danger: true }),
    );
    expect(usersServiceMock.updateUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ isAdvisor: false }),
    );
  });

  it('saveUser aborta el guardado si se cancela la confirmación de quitar el perfil de asesor', async () => {
    const { component } = configureAndCreate({
      getUserResult: of({ message: 'ok', user: buildUser({ isAdvisor: true }) }),
    });
    confirmDialogServiceMock.confirm.mockResolvedValue(false);

    component.editForm.patchValue({ isAdvisor: false });
    await component.saveUser();

    expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
    expect(usersServiceMock.updateUser).not.toHaveBeenCalled();
    expect(component.isSaving()).toBe(false);
  });

  it('saveUser no pide confirmación si "Es asesor legal" no pasa de true a false', async () => {
    const { component } = configureAndCreate();

    // Usuario cargado con isAdvisor:false (default de buildUser) y el
    // formulario se queda igual — no hay transición true→false.
    await component.saveUser();

    expect(confirmDialogServiceMock.confirm).not.toHaveBeenCalled();
    expect(usersServiceMock.updateUser).toHaveBeenCalled();
  });

  // QA 2026-09-15: "Editar" ya navega aquí en vez de abrir el panel de la
  // tabla, así que el reenvío de invitación (antes solo en la tabla) también
  // debe estar disponible desde la ficha para usuarios PENDING/EXPIRED.
  it('resendInvitation reenvía la invitación y notifica éxito', () => {
    const { component } = configureAndCreate({
      getUserResult: of({ message: 'ok', user: buildUser({ invitationStatus: 'PENDING' }) }),
    });
    usersServiceMock.resendInvitation.mockReturnValue(of({ message: 'Invitación reenviada a ana@lexar.com' }));

    component.resendInvitation();

    expect(usersServiceMock.resendInvitation).toHaveBeenCalledWith('u1');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Invitación reenviada a ana@lexar.com');
    expect(component.isResendingInvitation()).toBe(false);
  });

  it('resendInvitation en error notifica el mensaje del backend', () => {
    const { component } = configureAndCreate({
      getUserResult: of({ message: 'ok', user: buildUser({ invitationStatus: 'EXPIRED' }) }),
    });
    usersServiceMock.resendInvitation.mockReturnValue(throwError(() => ({ message: 'Límite alcanzado' })));

    component.resendInvitation();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Límite alcanzado');
    expect(component.isResendingInvitation()).toBe(false);
  });

  it('resendInvitation no hace nada si ya está reenviando o no hay usuario cargado', () => {
    const { component } = configureAndCreate();
    component.isResendingInvitation.set(true);

    component.resendInvitation();

    expect(usersServiceMock.resendInvitation).not.toHaveBeenCalled();
  });

  it('el header muestra "Invitado"/"Invitación vencida" y el botón de reenvío según invitationStatus', () => {
    const { fixture } = configureAndCreate({
      getUserResult: of({ message: 'ok', user: buildUser({ invitationStatus: 'PENDING' }) }),
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Invitado');
    const resendButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Reenviar invitación',
    );
    expect(resendButton).toBeTruthy();
  });

  it('el header no muestra el botón de reenvío para un usuario ACTIVE', () => {
    const { fixture } = configureAndCreate({
      getUserResult: of({ message: 'ok', user: buildUser({ invitationStatus: 'ACTIVE' }) }),
    });
    fixture.detectChanges();

    const resendButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Reenviar invitación',
    );
    expect(resendButton).toBeFalsy();
  });

  // QA 2026-09-15: el toggle "Es asesor legal" (inline-flex, ancho de
  // contenido) quedaba en la misma línea que "Guardar cambios" — el fix
  // envuelve el label en un <div> de bloque para forzar el salto de línea.
  it('el toggle "Es asesor legal" está envuelto en un bloque propio (no comparte línea con el botón)', () => {
    const { fixture, component } = configureAndCreate();

    component.activeTab.set('perfil');
    fixture.detectChanges();

    const toggleLabel: HTMLElement = fixture.nativeElement
      .querySelector('input[formcontrolname="isAdvisor"]')
      .closest('label');
    // El fix: el <label inline-flex> del toggle debe estar envuelto en un
    // <div> de bloque — si vuelve a quedar como hijo directo del <form>
    // (flujo inline), el botón "Guardar cambios" puede volver a renderizar
    // en la misma línea.
    expect(toggleLabel.parentElement?.tagName).toBe('DIV');
  });

  // QA 2026-09-15: "valida y ajusta" — la pestaña "Roles y permisos" pasó de
  // ser puramente de solo lectura a también poder abrir "Asignar roles" (si
  // hay permiso), completando la ficha como punto único de gestión.
  it('ngOnInit carga el catálogo de roles disponibles', () => {
    const { component } = configureAndCreate();

    expect(rolesServiceMock.getRoles).toHaveBeenCalled();
    expect(component.availableRoles()).toEqual([buildRole()]);
  });

  it('openRolesModal precarga los roles actuales del usuario y abre el modal', () => {
    const { component } = configureAndCreate({
      getUserResult: of({ message: 'ok', user: buildUser({ roles: [{ id: 'r1', name: 'Admin' }] }) }),
    });

    component.openRolesModal();

    expect(component.selectedRoleIds()).toEqual(['r1']);
    expect(component.showRolesModal()).toBe(true);
  });

  it('openRolesModal no hace nada si aún no hay usuario cargado', () => {
    const { component } = configureAndCreate({ routeId: null });

    component.openRolesModal();

    expect(component.showRolesModal()).toBe(false);
  });

  it('closeRolesModal cierra el modal y limpia la selección', () => {
    const { component } = configureAndCreate();
    component.openRolesModal();

    component.closeRolesModal();

    expect(component.showRolesModal()).toBe(false);
    expect(component.selectedRoleIds()).toEqual([]);
  });

  it('saveRoles asigna los roles, refresca el usuario y sus permisos, y cierra el modal', () => {
    const updatedUser = buildUser({ roles: [{ id: 'r1', name: 'Admin' }, { id: 'r2', name: 'Editor' }] });
    const { component } = configureAndCreate();
    usersServiceMock.assignRoles.mockReturnValue(of({ message: 'ok', user: updatedUser }));
    component.openRolesModal();

    component.saveRoles(['r1', 'r2']);

    expect(usersServiceMock.assignRoles).toHaveBeenCalledWith('u1', ['r1', 'r2']);
    expect(component.user()).toEqual(updatedUser);
    expect(rolesServiceMock.getRolePermissions).toHaveBeenCalledWith('r2');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Roles asignados exitosamente');
    expect(component.showRolesModal()).toBe(false);
    expect(component.isAssigningRoles()).toBe(false);
  });

  it('saveRoles en error notifica y detiene isAssigningRoles', () => {
    const { component } = configureAndCreate();
    usersServiceMock.assignRoles.mockReturnValue(throwError(() => ({ message: 'Rol inválido' })));
    component.openRolesModal();

    component.saveRoles(['r1']);

    expect(toastServiceMock.error).toHaveBeenCalledWith('Rol inválido');
    expect(component.isAssigningRoles()).toBe(false);
  });

  it('saveRoles no hace nada si no hay usuario cargado o ya está asignando', () => {
    const { component } = configureAndCreate();
    component.isAssigningRoles.set(true);

    component.saveRoles(['r1']);

    expect(usersServiceMock.assignRoles).not.toHaveBeenCalled();
  });

  it('el botón "Asignar roles" aparece en la pestaña de permisos cuando hay users.assign-roles', () => {
    const { fixture, component } = configureAndCreate();
    component.activeTab.set('permisos');
    fixture.detectChanges();

    const assignButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Asignar roles',
    );
    expect(assignButton).toBeTruthy();
  });

  it('el botón "Asignar roles" no aparece sin el permiso users.assign-roles', () => {
    const { fixture, component } = configureAndCreate({ permissions: ['users.edit'] });
    component.activeTab.set('permisos');
    fixture.detectChanges();

    const assignButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Asignar roles',
    );
    expect(assignButton).toBeFalsy();
  });
});
