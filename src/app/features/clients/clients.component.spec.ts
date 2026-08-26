import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ClientsComponent } from './clients.component';
import { ClientsService } from '../../core/services/clients.service';
import { CatalogsService } from '../../core/services/catalogs.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { FilesService } from '../../core/services/files.service';
import { ClientPortalInvitationsService } from '../../core/services/client-portal-invitations.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ClientResponse } from '../../core/models/client-backend.model';
import { CatalogItem } from '../../core/models/catalog-backend.model';

function buildClient(overrides: Partial<ClientResponse> = {}): ClientResponse {
  return {
    id: 'c1',
    fullName: 'María González',
    companyName: 'Corporación Legal S.A.S.',
    phone: '3001234567',
    email: 'maria@lexar.com',
    address: 'Calle 100',
    documentType: { id: 'd1', code: 'CC', label: 'Cédula', color: null },
    identificationNumber: '123456789',
    riskLevel: { id: 'r1', code: 'LOW', label: 'Bajo', color: '#22c55e' },
    isActive: true,
    assignedAdvisor: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('ClientsComponent', () => {
  let clientsServiceMock: {
    getClients: jest.Mock;
    getClient: jest.Mock;
    createClient: jest.Mock;
    updateClient: jest.Mock;
    toggleActive: jest.Mock;
  };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let navigateSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const documentTypes: CatalogItem[] = [
    { id: 'd1', catalogType: 'document_type', code: 'CC', label: 'Cédula', color: null, sortOrder: 0, isActive: true, isSystem: true },
  ];
  const riskLevels: CatalogItem[] = [
    { id: 'r1', catalogType: 'risk_level', code: 'LOW', label: 'Bajo', color: '#22c55e', sortOrder: 0, isActive: true, isSystem: true },
    { id: 'r2', catalogType: 'risk_level', code: 'HIGH', label: 'Alto', color: '#ef4444', sortOrder: 1, isActive: true, isSystem: true },
  ];

  function configure(openId: string | null = null): void {
    clientsServiceMock = {
      getClients: jest.fn().mockReturnValue(of({ message: '', clients: [buildClient()], total: 1, page: 1, limit: 10 })),
      getClient: jest.fn().mockReturnValue(of(buildClient())),
      createClient: jest.fn(),
      updateClient: jest.fn(),
      toggleActive: jest.fn(),
    };
    catalogsServiceMock = {
      getActiveCatalog: jest.fn((type: string) => (type === 'document_type' ? of(documentTypes) : of(riskLevels))),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => openId } },
    };

    TestBed.configureTestingModule({
      imports: [ClientsComponent],
      providers: [
        provideRouter([]),
        // El panel de edición (?openId=) renderiza ClientFormComponent ->
        // EntityFilesComponent + ClientPortalInvitationsComponent, que
        // inyectan estos tres servicios (mismo mock que client-form.component.spec.ts).
        { provide: FilesService, useValue: { getFilesByEntity: jest.fn().mockReturnValue(of([])) } },
        {
          provide: ClientPortalInvitationsService,
          useValue: { list: jest.fn().mockReturnValue(of({ portalUsers: [] })) },
        },
        {
          provide: SubscriptionService,
          useValue: {
            getEntitlements: jest.fn().mockReturnValue(
              of({
                planCode: 'FIRM',
                planName: 'Firma',
                status: 'active',
                isReadOnly: false,
                trialEndsAt: null,
                currentPeriodEnd: '2026-12-31',
                cancelAtPeriodEnd: false,
                features: { chatbot: false, clientPortal: true, advancedReports: false },
                limits: { maxUsers: null, maxActiveProcesses: null, maxStorageMb: null },
                usage: { users: 0, activeProcesses: 0, storageMb: 0 },
              }),
            ),
          },
        },
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
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
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  }

  function createComponent() {
    const fixture = TestBed.createComponent(ClientsComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  afterEach(() => {
    alertSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  it('al iniciar carga catálogos y clientes', () => {
    configure();
    const { component } = createComponent();

    expect(clientsServiceMock.getClients).toHaveBeenCalledWith(1, 10);
    expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('document_type');
    expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('risk_level');
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

  it('con ?openId= en la URL, abre el panel de edición del cliente y limpia el query param', () => {
    configure('c1');
    const { component } = createComponent();

    expect(clientsServiceMock.getClient).toHaveBeenCalledWith('c1');
    expect(component.panelOpen()).toBe(true);
    expect(component.editingClient()?.id).toBe('c1');
    expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {}, replaceUrl: true }));
  });

  it('togglePanel abre y cierra el panel, limpiando el formulario y el cliente en edición', () => {
    configure();
    const { component } = createComponent();

    component.togglePanel();
    expect(component.panelOpen()).toBe(true);

    component.editClient(buildClient());
    component.togglePanel();

    expect(component.panelOpen()).toBe(false);
    expect(component.editingClient()).toBeNull();
    expect(component.clientForm.value.fullName).toBe('');
  });

  it('editClient precarga el formulario con los datos del cliente', () => {
    configure();
    const { component } = createComponent();
    const client = buildClient({ companyName: null, phone: null, address: null, documentType: null, riskLevel: null });

    component.editClient(client);

    expect(component.editingClient()).toEqual(client);
    expect(component.clientForm.value.fullName).toBe(client.fullName);
    expect(component.clientForm.value.documentTypeId).toBe('');
    expect(component.panelOpen()).toBe(true);
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

  it('submitClient crea un cliente nuevo en éxito, recarga la lista y cierra el panel', () => {
    configure();
    clientsServiceMock.createClient.mockReturnValue(of(buildClient()));
    const { component } = createComponent();

    component.clientForm.setValue({
      fullName: 'Nuevo Cliente',
      companyName: '',
      phone: '',
      email: 'nuevo@lexar.com',
      address: '',
      documentTypeId: 'd1',
      identificationNumber: '123456',
      riskLevelId: '',
    });

    component.submitClient();

    expect(clientsServiceMock.createClient).toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
    expect(component.panelOpen()).toBe(false);
    expect(clientsServiceMock.getClients).toHaveBeenCalledTimes(2);
  });

  it('submitClient en error de creación, expone el mensaje', () => {
    configure();
    clientsServiceMock.createClient.mockReturnValue(throwError(() => ({ message: 'Error al crear cliente' })));
    const { component } = createComponent();

    component.clientForm.setValue({
      fullName: 'Nuevo Cliente',
      companyName: '',
      phone: '',
      email: 'nuevo@lexar.com',
      address: '',
      documentTypeId: 'd1',
      identificationNumber: '123456',
      riskLevelId: '',
    });

    component.submitClient();

    expect(component.errorMessage()).toBe('Error al crear cliente');
    expect(component.isSubmitting()).toBe(false);
  });

  it('submitClient actualiza un cliente existente en éxito', () => {
    configure();
    const client = buildClient();
    clientsServiceMock.updateClient.mockReturnValue(of(client));
    const { component } = createComponent();

    component.editClient(client);
    component.submitClient();

    expect(clientsServiceMock.updateClient).toHaveBeenCalledWith(client.id, expect.any(Object));
    expect(component.panelOpen()).toBe(false);
  });

  it('submitClient en error de actualización, expone el mensaje', () => {
    configure();
    const client = buildClient();
    clientsServiceMock.updateClient.mockReturnValue(throwError(() => ({ message: 'Error al actualizar cliente' })));
    const { component } = createComponent();

    component.editClient(client);
    component.submitClient();

    expect(component.errorMessage()).toBe('Error al actualizar cliente');
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

  it('toggleClientStatus en error muestra una alerta', async () => {
    configure();
    clientsServiceMock.toggleActive.mockReturnValue(throwError(() => ({ message: 'Error al cambiar estado del cliente' })));
    const { component } = createComponent();

    await component.toggleClientStatus(buildClient());

    expect(alertSpy).toHaveBeenCalledWith('Error al cambiar estado del cliente');
  });

  it('filteredClients filtra por búsqueda, estado y nivel de riesgo', () => {
    configure();
    clientsServiceMock.getClients.mockReturnValue(
      of({
        message: '',
        clients: [
          buildClient({ id: 'c1', fullName: 'María González', isActive: true, riskLevel: { id: 'r1', code: 'LOW', label: 'Bajo', color: null } }),
          buildClient({ id: 'c2', fullName: 'Carlos Ruiz', email: 'carlos@lexar.com', isActive: false, riskLevel: { id: 'r2', code: 'HIGH', label: 'Alto', color: null } }),
        ],
        total: 2,
        page: 1,
        limit: 10,
      }),
    );
    const { component } = createComponent();

    component.filterForm.patchValue({ search: 'carlos' });
    expect(component.filteredClients().map((c) => c.id)).toEqual(['c2']);

    component.filterForm.patchValue({ search: '', status: 'inactive' });
    expect(component.filteredClients().map((c) => c.id)).toEqual(['c2']);

    component.filterForm.patchValue({ status: 'all', riskLevel: 'HIGH' });
    expect(component.filteredClients().map((c) => c.id)).toEqual(['c2']);
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
