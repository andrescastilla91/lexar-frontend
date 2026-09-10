import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdvisorsComponent } from './advisors.component';
import { AdvisorsService } from '../../core/services/advisors.service';
import { UsersService } from '../../core/services/users.service';
import { CatalogsService } from '../../core/services/catalogs.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { ToastService } from '../../core/services/toast.service';
import { AdvisorResponse, AdvisorStatus } from '../../core/models/advisor-backend.model';
import { UserBackend } from '../../core/models/user-backend.model';
import { CatalogItem } from '../../core/models/catalog-backend.model';

function buildAdvisor(overrides: Partial<AdvisorResponse> = {}): AdvisorResponse {
  return {
    id: 'a1',
    userId: 'u1',
    specialty: { id: 's1', code: 'CIVIL', label: 'Civil', color: null },
    phone: '3001234567',
    status: AdvisorStatus.AVAILABLE,
    rating: 4,
    experienceYears: 5,
    isActive: true,
    companyId: 'c1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' },
    ...overrides,
  };
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
    twoFactorEnabled: true,
    roles: [],
    ...overrides,
  };
}

describe('AdvisorsComponent', () => {
  let advisorsServiceMock: {
    getAdvisors: jest.Mock;
    getAdvisor: jest.Mock;
    createAdvisor: jest.Mock;
    updateAdvisor: jest.Mock;
    toggleActive: jest.Mock;
  };
  let usersServiceMock: { getUsers: jest.Mock };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { error: jest.Mock; success: jest.Mock };
  let navigateSpy: jest.SpyInstance;

  const specialties: CatalogItem[] = [
    { id: 's1', catalogType: 'advisor_specialty', code: 'CIVIL', label: 'Civil', color: null, sortOrder: 0, isActive: true, isSystem: true },
  ];

  function configure(openId: string | null = null): void {
    advisorsServiceMock = {
      getAdvisors: jest.fn().mockReturnValue(of({ message: '', advisors: [buildAdvisor()], total: 1, page: 1, limit: 10 })),
      getAdvisor: jest.fn().mockReturnValue(of(buildAdvisor())),
      createAdvisor: jest.fn(),
      updateAdvisor: jest.fn(),
      toggleActive: jest.fn(),
    };
    usersServiceMock = {
      getUsers: jest.fn().mockReturnValue(of({ message: '', users: [buildUser()], total: 1, page: 1, limit: 100 })),
    };
    catalogsServiceMock = {
      getActiveCatalog: jest.fn().mockReturnValue(of(specialties)),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastMock = { error: jest.fn(), success: jest.fn() };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => openId } },
    };

    TestBed.configureTestingModule({
      imports: [AdvisorsComponent],
      providers: [
        provideRouter([]),
        { provide: AdvisorsService, useValue: advisorsServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal(['advisors.create', 'advisors.edit', 'advisors.activate', 'advisors.deactivate']),
          },
        },
      ],
    });

    const router = TestBed.inject(Router);
    navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  async function createComponent() {
    const fixture = TestBed.createComponent(AdvisorsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('al iniciar carga asesores, usuarios y especialidades', async () => {
    configure();
    const { component } = await createComponent();

    expect(advisorsServiceMock.getAdvisors).toHaveBeenCalledWith(1, 10);
    expect(usersServiceMock.getUsers).toHaveBeenCalledWith(1, 100);
    expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('advisor_specialty');
    expect(component.advisors().length).toBe(1);
    expect(component.isLoading()).toBe(false);
    expect(component.specialties()).toEqual(specialties);
  });

  it('en error al cargar asesores, expone el mensaje real y lo muestra en un toast', async () => {
    configure();
    // BUG-20 ola 1: advisorsService ya envuelve el error del backend en un
    // Error nativo (error.message), no en { error: { message } }.
    advisorsServiceMock.getAdvisors.mockReturnValue(throwError(() => new Error('Error al cargar asesores')));
    const { component } = await createComponent();

    expect(component.errorMessage()).toBe('Error al cargar asesores');
    expect(component.advisors()).toEqual([]);
    expect(component.isLoading()).toBe(false);
    expect(toastMock.error).toHaveBeenCalledWith('Error al cargar asesores');
  });

  it('en error al cargar usuarios, deja la lista de usuarios vacía', async () => {
    configure();
    usersServiceMock.getUsers.mockReturnValue(throwError(() => new Error('fail')));
    const { component } = await createComponent();

    expect(component.users()).toEqual([]);
  });

  it('con ?openId= en la URL, abre el panel de edición del asesor y limpia el query param', async () => {
    configure('a1');
    const { component } = await createComponent();

    expect(advisorsServiceMock.getAdvisor).toHaveBeenCalledWith('a1');
    expect(component.panelOpen()).toBe(true);
    expect(component.editingAdvisor()?.id).toBe('a1');
    expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {}, replaceUrl: true }));
  });

  it('togglePanel abre y cierra el panel, reseteando el form al cerrar', async () => {
    configure();
    const { component } = await createComponent();

    component.togglePanel();
    expect(component.panelOpen()).toBe(true);

    component.advisorForm.patchValue({ phone: '3009999999' });
    component.togglePanel();

    expect(component.panelOpen()).toBe(false);
    expect(component.editingAdvisor()).toBeNull();
    expect(component.advisorForm.value.phone).toBe('');
  });

  it('editAdvisor precarga el formulario y deshabilita el control de usuario', async () => {
    configure();
    const { component } = await createComponent();
    const advisor = buildAdvisor({ phone: '3007654321' });

    component.editAdvisor(advisor);

    expect(component.editingAdvisor()).toEqual(advisor);
    expect(component.advisorForm.controls.userId.disabled).toBe(true);
    expect(component.advisorForm.value.phone).toBe('3007654321');
    expect(component.panelOpen()).toBe(true);
  });

  it('submitAdvisor con formulario inválido, lo marca como touched y no llama al servicio', async () => {
    configure();
    const { component } = await createComponent();

    component.submitAdvisor();

    expect(component.errorMessage()).toBe('Por favor completa los campos obligatorios.');
    expect(advisorsServiceMock.createAdvisor).not.toHaveBeenCalled();
  });

  it('submitAdvisor no hace nada si ya está enviando', async () => {
    configure();
    const { component } = await createComponent();
    component.isSubmitting.set(true);

    component.submitAdvisor();

    expect(advisorsServiceMock.createAdvisor).not.toHaveBeenCalled();
  });

  it('submitAdvisor crea un asesor nuevo en éxito y recarga la lista', async () => {
    configure();
    advisorsServiceMock.createAdvisor.mockReturnValue(of(buildAdvisor()));
    const { component } = await createComponent();
    component.panelOpen.set(true);

    component.advisorForm.setValue({
      userId: 'u1',
      phone: '3001112222',
      specialtyId: 's1',
      status: AdvisorStatus.AVAILABLE,
      experienceYears: 3,
      rating: 0,
    });

    component.submitAdvisor();

    expect(advisorsServiceMock.createAdvisor).toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
    expect(component.panelOpen()).toBe(false);
    expect(advisorsServiceMock.getAdvisors).toHaveBeenCalledTimes(2);
  });

  it('submitAdvisor en error de creación, expone el mensaje real y lo muestra en un toast', async () => {
    configure();
    advisorsServiceMock.createAdvisor.mockReturnValue(throwError(() => new Error('Error al crear asesor')));
    const { component } = await createComponent();

    component.advisorForm.setValue({
      userId: 'u1',
      phone: '',
      specialtyId: 's1',
      status: AdvisorStatus.AVAILABLE,
      experienceYears: 3,
      rating: 0,
    });

    component.submitAdvisor();

    expect(component.errorMessage()).toBe('Error al crear asesor');
    expect(component.isSubmitting()).toBe(false);
    expect(toastMock.error).toHaveBeenCalledWith('Error al crear asesor');
  });

  it('submitAdvisor actualiza un asesor existente en éxito', async () => {
    configure();
    const advisor = buildAdvisor();
    const updated = buildAdvisor({ phone: '3005556666' });
    advisorsServiceMock.updateAdvisor.mockReturnValue(of(updated));
    const { component } = await createComponent();

    component.editAdvisor(advisor);
    component.submitAdvisor();

    expect(advisorsServiceMock.updateAdvisor).toHaveBeenCalledWith(advisor.id, expect.any(Object));
    expect(component.advisors().find((a) => a.id === advisor.id)?.phone).toBe('3005556666');
    expect(component.panelOpen()).toBe(false);
  });

  it('submitAdvisor en error de actualización, expone el mensaje real y lo muestra en un toast', async () => {
    configure();
    const advisor = buildAdvisor();
    advisorsServiceMock.updateAdvisor.mockReturnValue(throwError(() => new Error('Error al actualizar asesor')));
    const { component } = await createComponent();

    component.editAdvisor(advisor);
    component.submitAdvisor();

    expect(component.errorMessage()).toBe('Error al actualizar asesor');
    expect(component.isSubmitting()).toBe(false);
    expect(toastMock.error).toHaveBeenCalledWith('Error al actualizar asesor');
  });

  it('nextPage y previousPage respetan los límites de paginación', async () => {
    configure();
    const { component } = await createComponent();
    component.total.set(30);

    component.previousPage();
    expect(component.currentPage()).toBe(1);

    component.nextPage();
    expect(component.currentPage()).toBe(2);
    expect(advisorsServiceMock.getAdvisors).toHaveBeenCalledWith(2, 10);

    component.previousPage();
    expect(component.currentPage()).toBe(1);
  });

  it('toggleAdvisorStatus no llama al servicio si el usuario cancela la confirmación', async () => {
    configure();
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = await createComponent();

    await component.toggleAdvisorStatus(buildAdvisor());

    expect(advisorsServiceMock.toggleActive).not.toHaveBeenCalled();
  });

  it('toggleAdvisorStatus actualiza el asesor en éxito', async () => {
    configure();
    const advisor = buildAdvisor();
    const toggled = buildAdvisor({ isActive: false });
    advisorsServiceMock.toggleActive.mockReturnValue(of(toggled));
    const { component } = await createComponent();

    await component.toggleAdvisorStatus(advisor);

    expect(advisorsServiceMock.toggleActive).toHaveBeenCalledWith(advisor.id);
    expect(component.advisors().find((a) => a.id === advisor.id)?.isActive).toBe(false);
  });

  it('toggleAdvisorStatus en error, muestra un toast (BUG-20: ya no usa alert nativo)', async () => {
    configure();
    advisorsServiceMock.toggleActive.mockReturnValue(throwError(() => new Error('Error al desactivar asesor')));
    const { component } = await createComponent();

    await component.toggleAdvisorStatus(buildAdvisor());

    expect(toastMock.error).toHaveBeenCalledWith('Error al desactivar asesor');
  });

  it('filteredAdvisors filtra por término de búsqueda y estado', async () => {
    configure();
    advisorsServiceMock.getAdvisors.mockReturnValue(
      of({
        message: '',
        advisors: [
          buildAdvisor({ id: 'a1', status: AdvisorStatus.AVAILABLE, user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' } }),
          buildAdvisor({ id: 'a2', status: AdvisorStatus.BUSY, user: { id: 'u2', firstName: 'Carlos', lastName: 'Ruiz', email: 'carlos@lexar.com' } }),
        ],
        total: 2,
        page: 1,
        limit: 10,
      }),
    );
    const { component } = await createComponent();

    component.filterForm.patchValue({ search: 'carlos' });
    expect(component.filteredAdvisors().map((a) => a.id)).toEqual(['a2']);

    component.filterForm.patchValue({ search: '', status: AdvisorStatus.BUSY });
    expect(component.filteredAdvisors().map((a) => a.id)).toEqual(['a2']);
  });

  it('emptyStateMessage cambia según si hay filtros activos', async () => {
    configure();
    const { component } = await createComponent();

    expect(component.emptyStateMessage()).toBe('Comienza agregando tu primer asesor legal al equipo');

    component.filterForm.patchValue({ search: 'algo' });
    expect(component.emptyStateMessage()).toBe('No se encontraron resultados');
  });

  it('los contadores de estado reflejan la lista de asesores cargada', async () => {
    configure();
    advisorsServiceMock.getAdvisors.mockReturnValue(
      of({
        message: '',
        advisors: [
          buildAdvisor({ id: 'a1', status: AdvisorStatus.AVAILABLE, isActive: true }),
          buildAdvisor({ id: 'a2', status: AdvisorStatus.IN_HEARING }),
          buildAdvisor({ id: 'a3', status: AdvisorStatus.BUSY }),
        ],
        total: 3,
        page: 1,
        limit: 10,
      }),
    );
    const { component } = await createComponent();

    expect(component.availableAdvisors()).toBe(1);
    expect(component.inHearingCount()).toBe(1);
    expect(component.busyCount()).toBe(1);
  });

  it('availableUsers excluye usuarios ya asignados como asesor, salvo el que se está editando', async () => {
    configure();
    usersServiceMock.getUsers.mockReturnValue(
      of({
        message: '',
        users: [buildUser({ id: 'u1' }), buildUser({ id: 'u2', email: 'otro@lexar.com' })],
        total: 2,
        page: 1,
        limit: 100,
      }),
    );
    advisorsServiceMock.getAdvisors.mockReturnValue(
      of({ message: '', advisors: [buildAdvisor({ id: 'a1', userId: 'u1' })], total: 1, page: 1, limit: 10 }),
    );
    const { component } = await createComponent();

    expect(component.availableUsers().map((u) => u.id)).toEqual(['u2']);

    component.editAdvisor(buildAdvisor({ id: 'a1', userId: 'u1' }));
    expect(component.availableUsers().map((u) => u.id).sort()).toEqual(['u1', 'u2']);
  });
});
