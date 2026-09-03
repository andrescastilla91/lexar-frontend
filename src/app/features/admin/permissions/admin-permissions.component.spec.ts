import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminPermissionsComponent } from './admin-permissions.component';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminPermission, AdminPermissionGroup } from '../../../core/models/admin.model';

describe('AdminPermissionsComponent', () => {
  let platformAdminServiceMock: {
    listPermissions: jest.Mock;
    listPermissionGroups: jest.Mock;
    updatePermission: jest.Mock;
    updatePermissionGroup: jest.Mock;
  };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const permission: AdminPermission = {
    id: 'p1',
    code: 'users.create',
    description: 'Crear usuarios',
    label: 'Crear usuarios',
    groupCode: 'users',
    groupLabel: 'Usuarios',
    groupDescription: 'Quién administra las cuentas',
  };
  const permissionOtherGroup: AdminPermission = {
    id: 'p2',
    code: 'roles.create',
    description: 'Crear roles',
    label: 'Crear roles',
    groupCode: 'roles',
    groupLabel: 'Roles y permisos',
    groupDescription: null,
  };
  const group: AdminPermissionGroup = {
    code: 'users',
    label: 'Usuarios',
    description: 'Quién administra las cuentas',
  };

  function configure(): void {
    platformAdminServiceMock = {
      listPermissions: jest.fn().mockReturnValue(of([permission, permissionOtherGroup])),
      listPermissionGroups: jest.fn().mockReturnValue(of([group])),
      updatePermission: jest.fn(),
      updatePermissionGroup: jest.fn(),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AdminPermissionsComponent],
      providers: [
        { provide: PlatformAdminService, useValue: platformAdminServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AdminPermissionsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('carga grupos y permisos, y los agrupa por groupCode', () => {
    configure();
    const component = createComponent();

    expect(platformAdminServiceMock.listPermissionGroups).toHaveBeenCalled();
    expect(platformAdminServiceMock.listPermissions).toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);

    const grouped = component.groupedPermissions();
    expect(grouped).toHaveLength(2);
    const usersGroup = grouped.find((g) => g.code === 'users');
    expect(usersGroup?.label).toBe('Usuarios');
    expect(usersGroup?.permissions.map((p) => p.code)).toEqual(['users.create']);
  });

  it('usa groupLabel del propio permiso como fallback si el grupo aún no está en la lista de grupos', () => {
    configure();
    platformAdminServiceMock.listPermissionGroups.mockReturnValue(of([]));
    const component = createComponent();

    const rolesGroup = component.groupedPermissions().find((g) => g.code === 'roles');
    expect(rolesGroup?.label).toBe('Roles y permisos');
  });

  it('si falla la carga de grupos, muestra un toast de error', () => {
    configure();
    platformAdminServiceMock.listPermissionGroups.mockReturnValue(
      throwError(() => ({ message: 'Error de grupos' })),
    );
    const component = createComponent();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error de grupos');
    expect(component.isLoading()).toBe(false);
  });

  it('si falla la carga de permisos, muestra un toast de error', () => {
    configure();
    platformAdminServiceMock.listPermissions.mockReturnValue(
      throwError(() => ({ message: 'Error de permisos' })),
    );
    const component = createComponent();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error de permisos');
    expect(component.isLoading()).toBe(false);
  });

  describe('edición de permiso', () => {
    it('no guarda si el label queda vacío', () => {
      configure();
      const component = createComponent();
      component.startEditPermission(permission);
      component.draftPermissionLabel = '   ';

      component.savePermission(permission);

      expect(platformAdminServiceMock.updatePermission).not.toHaveBeenCalled();
      expect(toastServiceMock.error).toHaveBeenCalledWith('El nombre no puede quedar vacío.');
    });

    it('no guarda si la descripción queda vacía', () => {
      configure();
      const component = createComponent();
      component.startEditPermission(permission);
      component.draftPermissionDescription = '   ';

      component.savePermission(permission);

      expect(platformAdminServiceMock.updatePermission).not.toHaveBeenCalled();
      expect(toastServiceMock.error).toHaveBeenCalledWith('La descripción no puede quedar vacía.');
    });

    it('guarda label y description recortados y actualiza la lista local', () => {
      configure();
      const updated = { ...permission, label: 'Alta de usuario', description: 'Nueva descripción detallada' };
      platformAdminServiceMock.updatePermission.mockReturnValue(of(updated));
      const component = createComponent();
      component.startEditPermission(permission);
      component.draftPermissionLabel = '  Alta de usuario  ';
      component.draftPermissionDescription = '  Nueva descripción detallada  ';

      component.savePermission(permission);

      expect(platformAdminServiceMock.updatePermission).toHaveBeenCalledWith('users.create', {
        label: 'Alta de usuario',
        description: 'Nueva descripción detallada',
      });
      expect(component.permissions().find((p) => p.code === 'users.create')?.label).toBe(
        'Alta de usuario',
      );
      expect(component.permissions().find((p) => p.code === 'users.create')?.description).toBe(
        'Nueva descripción detallada',
      );
      expect(component.editingPermission()).toBeNull();
      expect(toastServiceMock.success).toHaveBeenCalled();
    });

    it('en error, muestra un toast y no limpia el modo edición', () => {
      configure();
      platformAdminServiceMock.updatePermission.mockReturnValue(
        throwError(() => ({ message: 'No se pudo' })),
      );
      const component = createComponent();
      component.startEditPermission(permission);
      component.draftPermissionLabel = 'Nuevo nombre';

      component.savePermission(permission);

      expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo');
      expect(component.editingPermission()).toBe('users.create');
    });

    it('startEditPermission precarga label y description actuales', () => {
      configure();
      const component = createComponent();

      component.startEditPermission(permission);

      expect(component.draftPermissionLabel).toBe('Crear usuarios');
      expect(component.draftPermissionDescription).toBe('Crear usuarios');
    });

    it('cancelEditPermission limpia el estado de edición', () => {
      configure();
      const component = createComponent();
      component.startEditPermission(permission);

      component.cancelEditPermission();

      expect(component.editingPermission()).toBeNull();
      expect(component.draftPermissionLabel).toBe('');
      expect(component.draftPermissionDescription).toBe('');
    });
  });

  describe('grupos colapsables y búsqueda', () => {
    it('los grupos arrancan colapsados', () => {
      configure();
      const component = createComponent();

      expect(component.isExpanded('users')).toBe(false);
      expect(component.isExpanded('roles')).toBe(false);
    });

    it('toggleGroup expande y vuelve a colapsar un grupo puntual', () => {
      configure();
      const component = createComponent();

      component.toggleGroup('users');
      expect(component.isExpanded('users')).toBe(true);
      expect(component.isExpanded('roles')).toBe(false);

      component.toggleGroup('users');
      expect(component.isExpanded('users')).toBe(false);
    });

    it('expandAll/collapseAll afectan todos los grupos', () => {
      configure();
      const component = createComponent();

      component.expandAll();
      expect(component.isExpanded('users')).toBe(true);
      expect(component.isExpanded('roles')).toBe(true);

      component.collapseAll();
      expect(component.isExpanded('users')).toBe(false);
      expect(component.isExpanded('roles')).toBe(false);
    });

    it('el buscador filtra por label/descripción/code y expande los grupos que coinciden', () => {
      configure();
      const component = createComponent();

      component.onSearchTermChange('crear usuarios');

      const visible = component.visibleGroups();
      expect(visible).toHaveLength(1);
      expect(visible[0].code).toBe('users');
      expect(component.isExpanded('users')).toBe(true);
    });

    it('el buscador es insensible a tildes/mayúsculas', () => {
      configure();
      const component = createComponent();

      component.onSearchTermChange('ROLES Y PERMISOS');

      const visible = component.visibleGroups();
      expect(visible.map((g) => g.code)).toEqual(['roles']);
    });

    it('sin coincidencias, visibleGroups queda vacío', () => {
      configure();
      const component = createComponent();

      component.onSearchTermChange('xyz-inexistente');

      expect(component.visibleGroups()).toEqual([]);
    });

    it('término vacío muestra todos los grupos sin filtrar', () => {
      configure();
      const component = createComponent();

      component.onSearchTermChange('users');
      component.onSearchTermChange('');

      expect(component.visibleGroups()).toHaveLength(2);
    });
  });

  describe('edición de grupo', () => {
    it('no guarda si el label del grupo queda vacío', () => {
      configure();
      const component = createComponent();
      const groupView = component.groupedPermissions().find((g) => g.code === 'users')!;
      component.startEditGroup(groupView);
      component.draftGroupLabel = '  ';

      component.saveGroup(groupView);

      expect(platformAdminServiceMock.updatePermissionGroup).not.toHaveBeenCalled();
      expect(toastServiceMock.error).toHaveBeenCalledWith('El nombre del grupo no puede quedar vacío.');
    });

    it('guarda label y description del grupo', () => {
      configure();
      const updated: AdminPermissionGroup = {
        code: 'users',
        label: 'Usuarios y equipo',
        description: 'desc nueva',
      };
      platformAdminServiceMock.updatePermissionGroup.mockReturnValue(of(updated));
      const component = createComponent();
      const groupView = component.groupedPermissions().find((g) => g.code === 'users')!;
      component.startEditGroup(groupView);
      component.draftGroupLabel = 'Usuarios y equipo';
      component.draftGroupDescription = 'desc nueva';

      component.saveGroup(groupView);

      expect(platformAdminServiceMock.updatePermissionGroup).toHaveBeenCalledWith('users', {
        label: 'Usuarios y equipo',
        description: 'desc nueva',
      });
      expect(component.groups().find((g) => g.code === 'users')?.label).toBe('Usuarios y equipo');
      expect(component.editingGroup()).toBeNull();
    });

    it('en error, muestra un toast', () => {
      configure();
      platformAdminServiceMock.updatePermissionGroup.mockReturnValue(
        throwError(() => ({ message: 'No se pudo actualizar grupo' })),
      );
      const component = createComponent();
      const groupView = component.groupedPermissions().find((g) => g.code === 'users')!;
      component.startEditGroup(groupView);
      component.draftGroupLabel = 'X';

      component.saveGroup(groupView);

      expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo actualizar grupo');
    });
  });
});
