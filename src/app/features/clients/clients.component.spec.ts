import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ClientsComponent } from './clients.component';
import { ClientsService } from '../../core/services/clients.service';
import { CatalogsService } from '../../core/services/catalogs.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { ToastService } from '../../core/services/toast.service';
import { ClientPersonType, ClientResponse } from '../../core/models/client-backend.model';
import { CatalogItem } from '../../core/models/catalog-backend.model';

// F33 (2026-09-14): ClientResponse ya no trae companyName/phone/email/
// assignedAdvisor/updatedAt (email/phone/companyName se movieron a
// ClientContact, editables solo desde la ficha del cliente) — este fixture
// refleja el modelo actual.
function buildClient(overrides: Partial<ClientResponse> = {}): ClientResponse {
  return {
    id: 'c1',
    fullName: 'María González',
    personType: ClientPersonType.NATURAL,
    address: 'Calle 100',
    documentType: { id: 'd1', code: 'CC', label: 'Cédula', color: null },
    identificationNumber: '123456789',
    riskLevel: { id: 'r1', code: 'LOW', label: 'Bajo', color: '#22c55e' },
    laftRisk: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    contacts: [],
    advisors: [],
    ...overrides,
  };
}

describe('ClientsComponent', () => {
  let clientsServiceMock: {
    getClients: jest.Mock;
    createClient: jest.Mock;
    toggleActive: jest.Mock;
  };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let advisorsServiceMock: { getAdvisors: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { error: jest.Mock; success: jest.Mock };
  let navigateSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const documentTypes: CatalogItem[] = [
    { id: 'd1', catalogType: 'document_type', code: 'CC', label: 'Cédula', color: null, sortOrder: 0, isActive: true, isSystem: true, personTypeScope: null },
  ];
  const riskLevels: CatalogItem[] = [
    { id: 'r1', catalogType: 'risk_level', code: 'LOW', label: 'Bajo', color: '#22c55e', sortOrder: 0, isActive: true, isSystem: true, personTypeScope: null },
    { id: 'r2', catalogType: 'risk_level', code: 'HIGH', label: 'Alto', color: '#ef4444', sortOrder: 1, isActive: true, isSystem: true, personTypeScope: null },
  ];

  function configure(openId: string | null = null): void {
    clientsServiceMock = {
      getClients: jest.fn().mockReturnValue(of({ message: '', clients: [buildClient()], total: 1, page: 1, limit: 10 })),
      createClient: jest.fn(),
      toggleActive: jest.fn(),
    };
    catalogsServiceMock = {
      getActiveCatalog: jest.fn((type: string) => (type === 'document_type' ? of(documentTypes) : of(riskLevels))),
    };
    advisorsServiceMock = {
      getAdvisors: jest.fn().mockReturnValue(of({ message: '', advisors: [], total: 0, page: 1, limit: 100 })),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastMock = { error: jest.fn(), success: jest.fn() };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => openId } },
    };

    TestBed.configureTestingModule({
      imports: [ClientsComponent],
      providers: [
        provideRouter([]),
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: AdvisorsService, useValue: advisorsServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal(['clients.create', 'clients.edit', 'clients.activate', 'clients.deactivate']),
          },
        },
      ],
    });

    const router = TestBed.inject(Router);
    navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  }

  function createComponent() {
    const fixture = TestBed.createComponent(ClientsComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it('al iniciar carga catálogos, asesores y clientes', () => {
    configure();
    const { component } = createComponent();

    expect(clientsServiceMock.getClients).toHaveBeenCalledWith(1, 10);
    expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('document_type');
    expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('risk_level');
    expect(advisorsServiceMock.getAdvisors).toHaveBeenCalledWith(1, 100, { isActive: true });
    expect(component.clients().length).toBe(1);
    expect(component.isLoading()).toBe(false);
  });

  it('en error al cargar clientes, limpia la lista y expone el error por consola', () => {
    configure();
    clientsServiceMock.getClients.mockReturnValue(throwError(() => new Error('fail')));
    const { component } = createComponent();

    expect(component.clients()).toEqual([]);
    expect(component.total()).toBe(0);
    expect(component.isLoading()).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('cuando la respuesta no trae un arreglo de clientes válido, filteredClients queda vacío', () => {
    configure();
    clientsServiceMock.getClients.mockReturnValue(of({ message: '', clients: null as unknown as ClientResponse[], total: 0, page: 1, limit: 10 }));
    const { component } = createComponent();

    expect(component.filteredClients()).toEqual([]);
    expect(component.activeCount()).toBe(0);
  });

  it('con ?openId= en la URL, navega directo a la ficha del cliente (F18)', () => {
    configure('c1');
    createComponent();

    // F33: la edición ya no ocurre en un panel inline — el ?openId= (llegado
    // desde la búsqueda global) redirige a /clientes/:id, que abre
    // ClientDetailComponent (ver client-detail.component.spec.ts).
    expect(navigateSpy).toHaveBeenCalledWith(['/clientes', 'c1']);
  });

  it('togglePanel abre y cierra el panel, limpiando el formulario de alta', () => {
    configure();
    const { component } = createComponent();

    component.togglePanel();
    expect(component.panelOpen()).toBe(true);

    component.clientForm.patchValue({ fullName: 'Algo escrito' });
    component.togglePanel();

    expect(component.panelOpen()).toBe(false);
    expect(component.clientForm.value.fullName).toBe('');
  });

  it('submitClient con formulario inválido, lo marca como touched y no llama al servicio', () => {
    configure();
    const { component } = createComponent();

    component.submitClient();

    expect(component.clientForm.touched).toBe(true);
    expect(clientsServiceMock.createClient).not.toHaveBeenCalled();
  });

  it('submitClient no hace nada si ya está enviando', () => {
    configure();
    const { component } = createComponent();
    component.isSubmitting.set(true);

    component.submitClient();

    expect(clientsServiceMock.createClient).not.toHaveBeenCalled();
  });

  it('submitClient crea un cliente nuevo en éxito, recarga la lista, cierra el panel y navega a su ficha', () => {
    configure();
    const created = buildClient({ id: 'new-1' });
    clientsServiceMock.createClient.mockReturnValue(of(created));
    const { component } = createComponent();

    component.clientForm.setValue({
      personType: ClientPersonType.NATURAL,
      fullName: 'Nuevo Cliente',
      address: '',
      documentTypeId: 'd1',
      identificationNumber: '123456',
      riskLevelId: '',
      advisorIds: [],
    });

    component.submitClient();

    expect(clientsServiceMock.createClient).toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
    expect(component.panelOpen()).toBe(false);
    expect(clientsServiceMock.getClients).toHaveBeenCalledTimes(2);
    expect(navigateSpy).toHaveBeenCalledWith(['/clientes', 'new-1']);
  });

  it('submitClient en error de creación, expone el mensaje', () => {
    configure();
    clientsServiceMock.createClient.mockReturnValue(throwError(() => ({ message: 'Error al crear cliente' })));
    const { component } = createComponent();

    component.clientForm.setValue({
      personType: ClientPersonType.NATURAL,
      fullName: 'Nuevo Cliente',
      address: '',
      documentTypeId: 'd1',
      identificationNumber: '123456',
      riskLevelId: '',
      advisorIds: [],
    });

    component.submitClient();

    expect(component.errorMessage()).toBe('Error al crear cliente');
    expect(component.isSubmitting()).toBe(false);
  });

  it('nextPage y previousPage respetan los límites de paginación', () => {
    configure();
    const { component } = createComponent();
    component.total.set(30);

    component.previousPage();
    expect(component.currentPage()).toBe(1);

    component.nextPage();
    expect(component.currentPage()).toBe(2);
    expect(clientsServiceMock.getClients).toHaveBeenCalledWith(2, 10);

    component.previousPage();
    expect(component.currentPage()).toBe(1);
  });

  it('toggleClientStatus no llama al servicio si el usuario cancela la confirmación', async () => {
    configure();
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.toggleClientStatus(buildClient());

    expect(clientsServiceMock.toggleActive).not.toHaveBeenCalled();
  });

  it('toggleClientStatus recarga la lista en éxito', async () => {
    configure();
    clientsServiceMock.toggleActive.mockReturnValue(of(buildClient({ isActive: false })));
    const { component } = createComponent();

    await component.toggleClientStatus(buildClient());

    expect(clientsServiceMock.toggleActive).toHaveBeenCalledWith('c1');
    expect(clientsServiceMock.getClients).toHaveBeenCalledTimes(2);
  });

  it('toggleClientStatus en error, muestra un toast (BUG-20: ya no usa alert nativo)', async () => {
    configure();
    clientsServiceMock.toggleActive.mockReturnValue(throwError(() => ({ message: 'Error al cambiar estado del cliente' })));
    const { component } = createComponent();

    await component.toggleClientStatus(buildClient());

    expect(toastMock.error).toHaveBeenCalledWith('Error al cambiar estado del cliente');
  });

  it('filteredClients filtra por búsqueda, estado, tipo de persona y nivel de riesgo', () => {
    configure();
    clientsServiceMock.getClients.mockReturnValue(
      of({
        message: '',
        clients: [
          buildClient({ id: 'c1', fullName: 'María González', isActive: true, personType: ClientPersonType.NATURAL, riskLevel: { id: 'r1', code: 'LOW', label: 'Bajo', color: null } }),
          buildClient({ id: 'c2', fullName: 'Corporación Ruiz S.A.S.', isActive: false, personType: ClientPersonType.JURIDICA, riskLevel: { id: 'r2', code: 'HIGH', label: 'Alto', color: null } }),
        ],
        total: 2,
        page: 1,
        limit: 10,
      }),
    );
    const { component } = createComponent();

    component.filterForm.patchValue({ search: 'ruiz' });
    expect(component.filteredClients().map((c) => c.id)).toEqual(['c2']);

    component.filterForm.patchValue({ search: '', status: 'inactive' });
    expect(component.filteredClients().map((c) => c.id)).toEqual(['c2']);

    component.filterForm.patchValue({ status: 'all', personType: 'JURIDICA' });
    expect(component.filteredClients().map((c) => c.id)).toEqual(['c2']);

    component.filterForm.patchValue({ personType: 'all', riskLevel: 'HIGH' });
    expect(component.filteredClients().map((c) => c.id)).toEqual(['c2']);
  });

  // Gap de cobertura de branches detectado por el CI (2026-09-15): el guard
  // defensivo `!Array.isArray` de filteredClients() y la rama status==='active'
  // nunca se ejercitaban con este valor exacto (el 'inactive' sí, pero no
  // 'active'; y clients() siempre llega como arreglo desde loadClients(), así
  // que el guard solo se dispara forzando el signal directamente).
  it('filteredClients queda vacío si clients() no es un arreglo (guard defensivo)', () => {
    configure();
    const { component } = createComponent();

    component.clients.set(null as unknown as ClientResponse[]);

    expect(component.filteredClients()).toEqual([]);
  });

  it('filteredClients filtra por estado "active"', () => {
    configure();
    clientsServiceMock.getClients.mockReturnValue(
      of({
        message: '',
        clients: [
          buildClient({ id: 'c1', isActive: true }),
          buildClient({ id: 'c2', isActive: false }),
        ],
        total: 2,
        page: 1,
        limit: 10,
      }),
    );
    const { component } = createComponent();

    component.filterForm.patchValue({ status: 'active' });

    expect(component.filteredClients().map((c) => c.id)).toEqual(['c1']);
  });

  it('onAdvisorIdsChange actualiza el campo advisorIds del formulario de alta', () => {
    configure();
    const { component } = createComponent();

    component.onAdvisorIdsChange(['a1', 'a2']);

    expect(component.clientForm.value.advisorIds).toEqual(['a1', 'a2']);
  });

  it('los contadores reflejan la lista de clientes cargada', () => {
    configure();
    clientsServiceMock.getClients.mockReturnValue(
      of({
        message: '',
        clients: [
          buildClient({ id: 'c1', isActive: true, riskLevel: { id: 'r1', code: 'LOW', label: 'Bajo', color: null } }),
          buildClient({ id: 'c2', isActive: false, riskLevel: { id: 'r2', code: 'HIGH', label: 'Alto', color: null } }),
        ],
        total: 2,
        page: 1,
        limit: 10,
      }),
    );
    const { component } = createComponent();

    expect(component.activeCount()).toBe(1);
    expect(component.highRiskCount()).toBe(1);
    expect(component.lowRiskCount()).toBe(1);
  });
});
