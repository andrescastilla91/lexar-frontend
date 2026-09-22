import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProcessesComponent } from './processes.component';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { ClientsService } from '../../core/services/clients.service';
import { CatalogsService } from '../../core/services/catalogs.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { LegalProcessResponse, ProcessStatus } from '../../core/models/legal-process.model';

/**
 * F40 Ola 4a: este spec se recortó junto con el componente — editar,
 * cambiar estado, contrapartes, plazos, tareas, anotaciones e historial ya
 * no viven aquí (ver process-detail.component.spec.ts). Lo que queda es
 * listado + filtros + creación (formulario esencial) + eliminar.
 */
describe('ProcessesComponent', () => {
  let legalProcessesServiceMock: {
    getLegalProcesses: jest.Mock;
    createLegalProcess: jest.Mock;
    deleteLegalProcess: jest.Mock;
  };
  let advisorsServiceMock: { getAdvisors: jest.Mock };
  let clientsServiceMock: { getClients: jest.Mock };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { success: jest.Mock; error: jest.Mock };
  let permissionsServiceMock: { hasPermission: jest.Mock; hasAnyPermission: jest.Mock };
  let queryParamId: string | null;
  let navigateSpy: jest.SpyInstance;

  const process: LegalProcessResponse = {
    id: 'p1',
    title: 'Proceso de prueba',
    description: null,
    status: ProcessStatus.DRAFT,
    stage: null,
    riskLevel: null,
    processType: null,
    contingency: null, // F40 §PRO-08 (ola 4b)
    amount: null,
    currency: null,
    court: null,
    caseNumber: null,
    internalCode: 'RGJ-000001',
    nextHearingDate: null,
    startDate: null,
    endDate: null,
    companyId: 'c1',
    clientId: 'cl1',
    client: { id: 'cl1', fullName: 'Cliente Uno', email: 'cliente@lexar.com' },
    advisors: [],
    matterId: null,
    matter: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  function configure(overrides: {
    legalProcesses?: Partial<typeof legalProcessesServiceMock>;
    confirmResolves?: boolean;
    queryParamId?: string | null;
    hasFullProcessAccess?: boolean;
  } = {}) {
    queryParamId = overrides.queryParamId ?? null;

    legalProcessesServiceMock = {
      getLegalProcesses: jest
        .fn()
        .mockReturnValue(of({ message: 'ok', legalProcesses: [process], total: 1, page: 1, limit: 10 })),
      createLegalProcess: jest.fn().mockReturnValue(of(process)),
      deleteLegalProcess: jest.fn().mockReturnValue(of(undefined)),
      ...overrides.legalProcesses,
    };

    advisorsServiceMock = {
      getAdvisors: jest.fn().mockReturnValue(of({ message: 'ok', advisors: [], total: 0, page: 1, limit: 100 })),
    };

    clientsServiceMock = {
      getClients: jest.fn().mockReturnValue(of({ message: 'ok', clients: [], total: 0, page: 1, limit: 100 })),
    };

    catalogsServiceMock = {
      getActiveCatalog: jest.fn().mockReturnValue(of([])),
    };

    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(overrides.confirmResolves ?? true) };
    toastMock = { success: jest.fn(), error: jest.fn() };
    // F36 (ola 5): mock directo del servicio (no de AuthService) — mismo
    // patrón que documents.component.spec.ts.
    permissionsServiceMock = {
      hasPermission: jest.fn().mockReturnValue(overrides.hasFullProcessAccess ?? false),
      hasAnyPermission: jest.fn().mockReturnValue(overrides.hasFullProcessAccess ?? false),
    };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => queryParamId } },
    };

    return TestBed.configureTestingModule({
      imports: [ProcessesComponent],
      providers: [
        provideRouter([]),
        { provide: LegalProcessesService, useValue: legalProcessesServiceMock },
        { provide: AdvisorsService, useValue: advisorsServiceMock },
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: PermissionsService, useValue: permissionsServiceMock },
      ],
    })
      .compileComponents()
      .then(() => {
        const router = TestBed.inject(Router);
        navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(ProcessesComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  describe('carga inicial', () => {
    it('carga procesos, asesores, clientes y catálogos al construirse', async () => {
      await configure();
      const component = createComponent();

      expect(component.processes()).toEqual([process]);
      expect(component.totalItems()).toBe(1);
      expect(component.isLoading()).toBe(false);
      expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('process_stage');
      expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('risk_level');
      expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('contract_type');
      // F40 §PRO-04
      expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('process_type');
    });

    it('en error de carga de procesos, expone el mensaje y apaga isLoading', async () => {
      await configure({
        legalProcesses: { getLegalProcesses: jest.fn().mockReturnValue(throwError(() => new Error('falló'))) },
      });
      const component = createComponent();

      expect(component.formError()).toBe('Error al cargar procesos');
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('filtros y paginación', () => {
    it('applyFilters reinicia a la página 1 y recarga', async () => {
      await configure();
      const component = createComponent();
      component.currentPage.set(3);

      component.applyFilters();

      expect(component.currentPage()).toBe(1);
      expect(legalProcessesServiceMock.getLegalProcesses).toHaveBeenCalledTimes(2);
    });

    it('resetFilters limpia el formulario y recarga', async () => {
      await configure();
      const component = createComponent();
      component.filterForm.patchValue({ search: 'algo', status: ProcessStatus.ACTIVE });

      component.resetFilters();

      expect(component.filterForm.value.search).toBe('');
      expect(component.filterForm.value.status).toBeNull();
    });

    it('nextPage avanza solo si hay más páginas', async () => {
      await configure({
        legalProcesses: {
          getLegalProcesses: jest
            .fn()
            .mockReturnValue(of({ message: 'ok', legalProcesses: [process], total: 25, page: 1, limit: 10 })),
        },
      });
      const component = createComponent();

      component.nextPage();
      expect(component.currentPage()).toBe(2);

      component.currentPage.set(3);
      component.nextPage();
      expect(component.currentPage()).toBe(3);
    });

    it('previousPage retrocede solo si no está en la primera página', async () => {
      await configure();
      const component = createComponent();

      component.previousPage();
      expect(component.currentPage()).toBe(1);

      component.currentPage.set(2);
      component.previousPage();
      expect(component.currentPage()).toBe(1);
    });
  });

  describe('togglePanel', () => {
    it('abre el panel', async () => {
      await configure();
      const component = createComponent();

      component.togglePanel();

      expect(component.panelOpen()).toBe(true);
    });

    it('al cerrar, resetea el formulario', async () => {
      await configure();
      const component = createComponent();
      component.panelOpen.set(true);
      component.processForm.patchValue({ title: 'Algo' });

      component.togglePanel();

      expect(component.panelOpen()).toBe(false);
      expect(component.processForm.value.title).toBe('');
    });
  });

  // QA 2026-09-17: mismo patrón mobile que clients.component.ts / users.component.ts
  // — panel de "Filtros" colapsado por defecto en mobile, se alterna con un botón.
  describe('filtersOpen', () => {
    it('arranca colapsado y se alterna', async () => {
      await configure();
      const component = createComponent();

      expect(component.filtersOpen()).toBe(false);

      component.filtersOpen.set(true);
      expect(component.filtersOpen()).toBe(true);
    });
  });

  describe('submitProcess (F40 Ola 4a: solo creación — editar vive en ProcessDetailComponent)', () => {
    it('con formulario inválido, marca error y no llama al servicio', async () => {
      await configure();
      const component = createComponent();

      component.submitProcess();

      expect(component.formError()).toBe('Completa los campos obligatorios.');
      expect(legalProcessesServiceMock.createLegalProcess).not.toHaveBeenCalled();
    });

    it('crea un proceso nuevo con status DRAFT y navega a su ficha de detalle', async () => {
      await configure();
      const component = createComponent();
      component.panelOpen.set(true);
      component.processForm.patchValue({
        title: 'Nuevo proceso',
        clientId: 'cl1',
        stageId: 'st1',
        riskLevelId: 'rl1',
        processTypeId: 'type-1',
      });

      component.submitProcess();

      expect(legalProcessesServiceMock.createLegalProcess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Nuevo proceso', clientId: 'cl1', status: ProcessStatus.DRAFT }),
      );
      expect(component.isLoading()).toBe(false);
      expect(component.panelOpen()).toBe(false);
      expect(navigateSpy).toHaveBeenCalledWith(['/procesos', process.id]);
    });

    // BUG-10: legalProcessesService.createLegalProcess() envuelve el error
    // en un Error nativo con el mensaje real — .error no existe ahí.
    it('en error, expone el mensaje real en el form y en el toast', async () => {
      await configure({
        legalProcesses: {
          createLegalProcess: jest.fn().mockReturnValue(throwError(() => new Error('Cliente inválido'))),
        },
      });
      const component = createComponent();
      component.processForm.patchValue({
        title: 'x',
        clientId: 'cl1',
        stageId: 's1',
        riskLevelId: 'r1',
        processTypeId: 'type-1',
      });

      component.submitProcess();

      expect(component.formError()).toBe('Cliente inválido');
      expect(toastMock.error).toHaveBeenCalledWith('Cliente inválido');
      expect(component.isLoading()).toBe(false);
    });

    // F40 §PRO-04: se promueve a esencial en creación — el formulario no
    // deja guardar sin tipo de proceso (a diferencia de matterId, que ya no
    // vive en este formulario).
    it('no crea el proceso si falta processTypeId (ahora obligatorio en creación)', async () => {
      await configure();
      const component = createComponent();
      component.processForm.patchValue({
        title: 'Nuevo proceso',
        clientId: 'cl1',
        stageId: 'st1',
        riskLevelId: 'rl1',
      });

      component.submitProcess();

      expect(legalProcessesServiceMock.createLegalProcess).not.toHaveBeenCalled();
      expect(component.formError()).toBe('Completa los campos obligatorios.');
    });
  });

  describe('setAdvisorIds', () => {
    it('escribe el array completo de ids recibido de MultiSelectComponent', async () => {
      await configure();
      const component = createComponent();

      component.setAdvisorIds(['adv1', 'adv2']);
      expect(component.processForm.value.advisorIds).toEqual(['adv1', 'adv2']);

      component.setAdvisorIds([]);
      expect(component.processForm.value.advisorIds).toEqual([]);
    });
  });

  describe('deleteProcess', () => {
    it('si el usuario cancela, no elimina', async () => {
      await configure({ confirmResolves: false });
      const component = createComponent();

      await component.deleteProcess(process);

      expect(legalProcessesServiceMock.deleteLegalProcess).not.toHaveBeenCalled();
    });

    it('si confirma, elimina y recarga la lista', async () => {
      await configure({ confirmResolves: true });
      const component = createComponent();

      await component.deleteProcess(process);

      expect(legalProcessesServiceMock.deleteLegalProcess).toHaveBeenCalledWith('p1');
      expect(component.isLoading()).toBe(false);
    });

    it('en error, muestra un toast (BUG-20: ya no usa alert nativo)', async () => {
      await configure({
        confirmResolves: true,
        legalProcesses: { deleteLegalProcess: jest.fn().mockReturnValue(throwError(() => new Error('falló'))) },
      });
      const component = createComponent();

      await component.deleteProcess(process);

      expect(toastMock.error).toHaveBeenCalledWith('falló');
      expect(component.isLoading()).toBe(false);
    });
  });

  // F18/F40 Ola 4a: ?openId= ahora redirige a la ficha de detalle en vez de
  // abrir un modal de edición (mismo patrón que clients.component.ts).
  describe('ngOnInit / redirectFromQueryParam', () => {
    it('sin openId en la ruta, no navega', async () => {
      await configure({ queryParamId: null });
      createComponent();

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('con openId en la ruta, navega a /procesos/:id', async () => {
      await configure({ queryParamId: 'p1' });
      createComponent();

      expect(navigateSpy).toHaveBeenCalledWith(['/procesos', 'p1']);
    });
  });

  describe('F36 (ola 5): alcance en la tabla de procesos', () => {
    it('sin permiso legal_processes.view.all, pasa hasFullAccess=false a la tabla', async () => {
      await configure({ hasFullProcessAccess: false });
      const fixture = TestBed.createComponent(ProcessesComponent);
      fixture.detectChanges();

      expect(permissionsServiceMock.hasPermission).toHaveBeenCalledWith('legal_processes.view.all');
      expect(fixture.componentInstance.hasFullProcessAccess()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain('Ves los procesos a tu cargo.');
    });

    it('con permiso legal_processes.view.all, pasa hasFullAccess=true a la tabla', async () => {
      await configure({ hasFullProcessAccess: true });
      const fixture = TestBed.createComponent(ProcessesComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.hasFullProcessAccess()).toBe(true);
      expect(fixture.nativeElement.textContent).not.toContain('Ves los procesos a tu cargo.');
    });
  });
});
