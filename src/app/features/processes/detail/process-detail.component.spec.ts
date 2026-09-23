import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';
import { ProcessDetailComponent } from './process-detail.component';
import { LegalProcessesService } from '../../../core/services/legal-processes.service';
import { ProcessEventsService } from '../../../core/services/process-events.service';
import { AdvisorsService } from '../../../core/services/advisors.service';
import { ClientsService } from '../../../core/services/clients.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { FilesService } from '../../../core/services/files.service';
import { DeadlinesService } from '../../../core/services/deadlines.service';
import { TasksService } from '../../../core/services/tasks.service';
import { TaskStatusesService } from '../../../core/services/task-statuses.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ToastService } from '../../../core/services/toast.service';
import { PortalVisibilityPolicyService } from '../../../core/services/portal-visibility-policy.service';
import { LegalProcessResponse, ProcessStatus } from '../../../core/models/legal-process.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { ProcessEvent, ProcessEventType } from '../../../core/models/process-event.model';
import { DeadlineComputationType, DeadlineResponse, DeadlineStatus } from '../../../core/models/deadline.model';
import { TaskPriority, TaskResponse } from '../../../core/models/task.model';
import { TaskStatusResponse } from '../../../core/models/task-status.model';
import { ClientMatterResponse } from '../../../core/models/client-backend.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';

/**
 * F40 Ola 4a: cubre la lógica que se trasladó desde processes.component.ts
 * a esta ficha de detalle (editar, cambiar estado, plazos, tareas,
 * anotaciones, historial) — ver "Ola 4 (revisada)" en
 * F40-ajustes-procesos-piloto.md.
 */
describe('ProcessDetailComponent', () => {
  let legalProcessesServiceMock: {
    getLegalProcess: jest.Mock;
    updateLegalProcess: jest.Mock;
    updateProcessStatus: jest.Mock;
  };
  let processEventsServiceMock: {
    createAnnotation: jest.Mock;
    getProcessHistory: jest.Mock;
    setEventVisibility: jest.Mock;
  };
  let deadlinesServiceMock: { getForProcess: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  let tasksServiceMock: {
    getForProcess: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    getTemplates: jest.Mock;
    instantiateTemplate: jest.Mock;
  };
  let filesServiceMock: {
    uploadFile: jest.Mock;
    downloadFile: jest.Mock;
    getDownloadUrl: jest.Mock;
    fileDeleted$: Subject<string>;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { success: jest.Mock; error: jest.Mock };
  let routeId: string | null;
  let routeQueryParams: Record<string, string>;

  const process: LegalProcessResponse = {
    id: 'p1',
    title: 'Proceso de prueba',
    description: null,
    status: ProcessStatus.DRAFT,
    stage: { id: 'st1', code: 'INICIO', label: 'Inicio', color: null },
    riskLevel: { id: 'rl1', code: 'BAJO', label: 'Bajo', color: null },
    processType: { id: 'type-1', code: 'JUDICIAL', label: 'Judicial', color: null },
    contingency: null,
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

  const event: ProcessEvent = {
    id: 'ev1',
    type: ProcessEventType.ANNOTATION,
    description: 'Nota',
    metadata: null,
    attachments: null,
    legalProcessId: 'p1',
    user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' },
    createdAt: new Date('2026-01-01'),
  };

  const deadline: DeadlineResponse = {
    id: 'd1',
    processId: 'p1',
    process: null,
    title: 'Audiencia',
    type: null,
    dueAt: '2026-02-01T10:00:00.000Z',
    allDay: false,
    notes: null,
    status: DeadlineStatus.PENDING,
    assignees: [],
    scope: null,
    blocksAgenda: false,
    durationMinutes: null,
    computationType: DeadlineComputationType.BUSINESS_DAYS,
    needsReview: false,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const advisor: AdvisorResponse = {
    id: 'adv1',
    userId: 'u1',
    specialties: [],
    phone: null,
    professionalCard: null,
    mobileSecondary: null,
    rating: null,
    experienceYears: 3,
    isActive: true,
    companyId: 'c1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' },
  };

  const taskStatus: TaskStatusResponse = {
    id: 'ts1',
    code: 'todo',
    label: 'Por hacer',
    color: null,
    isTerminal: false,
    requiresApproval: false,
    requiresNote: false,
    sortOrder: 0,
    isSystem: true,
    isActive: true,
    approvers: [],
  };

  function buildTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
    return {
      id: 't1',
      title: 'Tarea',
      description: null,
      processId: 'p1',
      process: null,
      clientId: null,
      client: null,
      assigneeUserId: null,
      assignee: null,
      dueAt: null,
      status: taskStatus,
      pendingApproval: null,
      priority: TaskPriority.NORMAL,
      sortOrder: 0,
      createdBy: null,
      completedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  function configure(overrides: {
    legalProcesses?: Partial<typeof legalProcessesServiceMock>;
    routeId?: string | null;
    queryParams?: Record<string, string>;
    confirmResolves?: boolean;
  } = {}) {
    routeId = overrides.routeId === undefined ? 'p1' : overrides.routeId;
    routeQueryParams = overrides.queryParams ?? {};

    legalProcessesServiceMock = {
      getLegalProcess: jest.fn().mockReturnValue(of(process)),
      updateLegalProcess: jest.fn().mockReturnValue(of(process)),
      updateProcessStatus: jest.fn().mockReturnValue(of(process)),
      ...overrides.legalProcesses,
    };

    processEventsServiceMock = {
      createAnnotation: jest.fn().mockReturnValue(of(event)),
      getProcessHistory: jest.fn().mockReturnValue(of([event])),
      setEventVisibility: jest.fn().mockReturnValue(of(event)),
    };

    deadlinesServiceMock = {
      getForProcess: jest.fn().mockReturnValue(of([deadline])),
      create: jest.fn().mockReturnValue(of(deadline)),
      update: jest.fn().mockReturnValue(of(deadline)),
      delete: jest.fn().mockReturnValue(of(undefined)),
    };

    tasksServiceMock = {
      getForProcess: jest.fn().mockReturnValue(of([buildTask()])),
      create: jest.fn().mockReturnValue(of(buildTask())),
      delete: jest.fn().mockReturnValue(of(undefined)),
      getTemplates: jest.fn().mockReturnValue(of([])),
      instantiateTemplate: jest.fn().mockReturnValue(of([buildTask(), buildTask({ id: 't2' })])),
    };

    filesServiceMock = {
      uploadFile: jest.fn(),
      downloadFile: jest.fn().mockReturnValue(of(undefined)),
      getDownloadUrl: jest
        .fn()
        .mockReturnValue(of({ url: 'https://s3/x', filename: 'evidencia.pdf', contentType: 'application/pdf', expiresIn: 300 })),
      fileDeleted$: new Subject<string>(),
    };

    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(overrides.confirmResolves ?? true) };
    toastMock = { success: jest.fn(), error: jest.fn() };

    // F40 §PRO-08 (ola 4b): ProcessDetailComponent ahora embebe ngx-editor
    // (campo description y modal de anotación), cuyo SanitizeHtmlPipe interno
    // también inyecta DomSanitizer y llama bypassSecurityTrustHtml() para
    // pintar los íconos SVG del toolbar. Si el mock no lo implementa, TestBed
    // explota con "this.sanitizer.bypassSecurityTrustHtml is not a function".
    const sanitizerMock = {
      bypassSecurityTrustResourceUrl: jest.fn((url: string): SafeResourceUrl => url as unknown as SafeResourceUrl),
      bypassSecurityTrustHtml: jest.fn((html: string): SafeHtml => html as unknown as SafeHtml),
    };

    return TestBed.configureTestingModule({
      imports: [ProcessDetailComponent],
      providers: [
        provideRouter([]),
        { provide: DomSanitizer, useValue: sanitizerMock },
        { provide: LegalProcessesService, useValue: legalProcessesServiceMock },
        { provide: ProcessEventsService, useValue: processEventsServiceMock },
        { provide: AdvisorsService, useValue: { getAdvisors: jest.fn().mockReturnValue(of({ advisors: [] })) } },
        {
          provide: ClientsService,
          useValue: {
            getClients: jest.fn().mockReturnValue(of({ clients: [] })),
            getMatters: jest.fn().mockReturnValue(of([])),
          },
        },
        { provide: CatalogsService, useValue: { getActiveCatalog: jest.fn().mockReturnValue(of([])) } },
        { provide: FilesService, useValue: filesServiceMock },
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TaskStatusesService, useValue: { getAll: jest.fn().mockReturnValue(of([taskStatus])) } },
        { provide: PortalVisibilityPolicyService, useValue: { getAll: jest.fn().mockReturnValue(of([])) } },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(routeId ? { id: routeId } : {}),
              queryParamMap: convertToParamMap(routeQueryParams),
            },
          },
        },
        // F40 Ola 4a — fix (2026-09-21, unit tests reales): HasPermissionDirective
        // ("Guardar cambios" en Datos, botones internos de Contrapartes/Tareas)
        // inyecta PermissionsService directo; sin este mock, Angular intentaba
        // resolver el PermissionsService/AuthService/HttpClient reales y
        // reventaba con NG0201 en el primer detectChanges() de casi cualquier
        // test. Mismo mock que ya usa process-counterparties-modal.component.spec.ts.
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal<string[]>([]),
          },
        },
      ],
    }).compileComponents();
  }

  function createComponent() {
    const fixture = TestBed.createComponent(ProcessDetailComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    return { fixture, component: fixture.componentInstance, router };
  }

  describe('carga inicial', () => {
    it('carga el proceso por :id y precarga el formulario de Datos', async () => {
      await configure();
      const { component } = createComponent();

      expect(legalProcessesServiceMock.getLegalProcess).toHaveBeenCalledWith('p1');
      expect(component.process()?.id).toBe('p1');
      expect(component.isLoading()).toBe(false);
      expect(component.editForm.value.title).toBe('Proceso de prueba');
      expect(component.editForm.value.clientId).toBe('cl1');
    });

    it('sin :id en la ruta, no carga nada y apaga isLoading', async () => {
      await configure({ routeId: null });
      const { component } = createComponent();

      expect(legalProcessesServiceMock.getLegalProcess).not.toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
      expect(component.process()).toBeNull();
    });

    it('en error de carga, deja process() en null', async () => {
      await configure({
        legalProcesses: { getLegalProcess: jest.fn().mockReturnValue(throwError(() => new Error('no existe'))) },
      });
      const { component, fixture } = createComponent();

      expect(component.process()).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Proceso no encontrado');
    });

    it('precarga contingencia, cuantía y moneda cuando el proceso los trae (F40 §PRO-08)', async () => {
      await configure({
        legalProcesses: {
          getLegalProcess: jest.fn().mockReturnValue(
            of({
              ...process,
              contingency: { id: 'cont-1', code: 'PROBABLE', label: 'Probable', color: 'danger' },
              amount: '1500000',
              currency: 'USD',
            }),
          ),
        },
      });
      const { component } = createComponent();

      expect(component.editForm.value.contingencyId).toBe('cont-1');
      expect(component.editForm.value.amount).toBe('1500000');
      expect(component.editForm.value.currency).toBe('USD');
    });
  });

  describe('tabs', () => {
    it('arranca en la pestaña Datos y cambia al hacer clic en otra', async () => {
      await configure();
      const { component, fixture } = createComponent();

      expect(component.activeTab()).toBe('datos');

      component.activeTab.set('plazos');
      fixture.detectChanges();

      expect(component.activeTab()).toBe('plazos');
    });
  });

  describe('saveDatos', () => {
    it('guarda los cambios del formulario de Datos', async () => {
      await configure();
      const { component } = createComponent();
      component.editForm.patchValue({ title: 'Título editado' });

      component.saveDatos();

      expect(legalProcessesServiceMock.updateLegalProcess).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ title: 'Título editado' }),
      );
      expect(toastMock.success).toHaveBeenCalled();
    });

    it('en error, expone el mensaje real (BUG-10)', async () => {
      await configure({
        legalProcesses: { updateLegalProcess: jest.fn().mockReturnValue(throwError(() => new Error('Cliente inválido'))) },
      });
      const { component } = createComponent();

      component.saveDatos();

      expect(component.errorMessage()).toBe('Cliente inválido');
      expect(toastMock.error).toHaveBeenCalledWith('Cliente inválido');
    });

    it('envía cuantía numérica, moneda y contingencia al guardar cuando están diligenciadas (F40 §PRO-08)', async () => {
      await configure();
      const { component } = createComponent();
      component.editForm.patchValue({ contingencyId: 'cont-1', amount: '2500000', currency: 'EUR' });

      component.saveDatos();

      expect(legalProcessesServiceMock.updateLegalProcess).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ contingencyId: 'cont-1', amount: 2500000, currency: 'EUR' }),
      );
    });
  });

  describe('cambiar estado (HU-14)', () => {
    it('openStatusModal precarga el estado actual del proceso', async () => {
      await configure();
      const { component } = createComponent();

      component.openStatusModal();

      expect(component.statusModalOpen()).toBe(true);
      expect(component.statusForm.value.status).toBe(ProcessStatus.DRAFT);
    });

    it('updateStatus actualiza el proceso y cierra el modal', async () => {
      await configure({
        legalProcesses: {
          updateProcessStatus: jest.fn().mockReturnValue(of({ ...process, status: ProcessStatus.ACTIVE })),
        },
      });
      const { component } = createComponent();
      component.statusForm.patchValue({ status: ProcessStatus.ACTIVE, notes: '' });

      await component.updateStatus();

      expect(legalProcessesServiceMock.updateProcessStatus).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ status: ProcessStatus.ACTIVE }),
      );
      expect(component.process()?.status).toBe(ProcessStatus.ACTIVE);
      expect(component.statusModalOpen()).toBe(false);
    });

    // F40 §PRO-08 / QA-GATE-1: configureEditableFields() bloquea distintos
    // campos por estado (ver comentario junto al método) — antes de esto
    // solo DRAFT (carga inicial) y ACTIVE (test de arriba) se ejercitaban.
    it.each([
      ProcessStatus.UNDER_REVIEW,
      ProcessStatus.SUSPENDED,
      ProcessStatus.COMPLETED,
      ProcessStatus.CANCELLED,
      ProcessStatus.ARCHIVED,
    ])('al pasar a %s, bloquea cliente (y todo el resto si es un estado terminal)', async (status) => {
      await configure({
        legalProcesses: {
          updateProcessStatus: jest.fn().mockReturnValue(of({ ...process, status })),
        },
      });
      const { component } = createComponent();
      component.statusForm.patchValue({ status, notes: '' });

      await component.updateStatus();

      expect(component.editForm.get('clientId')?.disabled).toBe(true);
    });
  });

  describe('processStatusMessage (F40 §PRO-08 / QA-GATE-1)', () => {
    it('devuelve el mensaje correcto para cada estado no editable', async () => {
      await configure();
      const { component } = createComponent();

      const cases: Array<[ProcessStatus, string]> = [
        [ProcessStatus.COMPLETED, 'Este proceso está completado. No se pueden realizar cambios.'],
        [ProcessStatus.CANCELLED, 'Este proceso está cancelado. No se pueden realizar cambios.'],
        [ProcessStatus.ARCHIVED, 'Este proceso está archivado. No se pueden realizar cambios.'],
        [ProcessStatus.ACTIVE, 'El número de caso y el cliente no pueden modificarse una vez el proceso está activo.'],
        [ProcessStatus.UNDER_REVIEW, 'El proceso está en revisión. Algunas modificaciones están restringidas.'],
        [ProcessStatus.SUSPENDED, 'El proceso está suspendido. La etapa no puede modificarse.'],
      ];

      for (const [status, expected] of cases) {
        component.process.set({ ...process, status });
        expect(component.processStatusMessage()).toBe(expected);
      }
    });

    it('no muestra mensaje cuando no hay proceso cargado', async () => {
      await configure();
      const { component } = createComponent();

      component.process.set(null);

      expect(component.processStatusMessage()).toBeNull();
    });
  });

  describe('filteredStages / isSelectedStageOutOfScope / selectedMatter (F40 QA-GATE-1)', () => {
    it('filtra etapas por tipo de proceso y conserva la etapa seleccionada aunque quede fuera de alcance', async () => {
      await configure();
      const { component } = createComponent();
      const baseStage = {
        catalogType: 'process_stage' as const,
        sortOrder: 1,
        isActive: true,
        isSystem: false,
        personTypeScope: null,
        color: null,
      };
      component.stages.set([
        { ...baseStage, id: 'st-a', code: 'A', label: 'Etapa A', processTypeScope: 'type-1' } as CatalogItem,
        { ...baseStage, id: 'st-b', code: 'B', label: 'Etapa B', processTypeScope: 'type-2' } as CatalogItem,
        { ...baseStage, id: 'st-c', code: 'C', label: 'Etapa C', processTypeScope: null } as CatalogItem,
      ]);

      component.editForm.patchValue({ processTypeId: 'type-1', stageId: 'st-b' });
      expect(component.isSelectedStageOutOfScope()).toBe(true);
      expect(component.filteredStages().map((s) => s.id)).toEqual(['st-a', 'st-c', 'st-b']);

      component.editForm.patchValue({ stageId: 'st-a' });
      expect(component.isSelectedStageOutOfScope()).toBe(false);

      component.editForm.patchValue({ processTypeId: '', stageId: '' });
      expect(component.isSelectedStageOutOfScope()).toBe(false);
    });

    it('resuelve la subcarpeta (matter) seleccionada, o null si no hay coincidencia o selección', async () => {
      await configure();
      const { component } = createComponent();
      component.matters.set([{ id: 'm1' } as unknown as ClientMatterResponse]);

      component.editForm.patchValue({ matterId: 'm1' });
      expect(component.selectedMatter()?.id).toBe('m1');

      component.editForm.patchValue({ matterId: 'no-existe' });
      expect(component.selectedMatter()).toBeNull();

      component.editForm.patchValue({ matterId: '' });
      expect(component.selectedMatter()).toBeNull();
    });
  });

  describe('plazos (F13)', () => {
    it('carga los plazos del proceso al iniciar', async () => {
      await configure();
      const { component } = createComponent();

      expect(deadlinesServiceMock.getForProcess).toHaveBeenCalledWith('p1');
      expect(component.processDeadlines()).toEqual([deadline]);
    });

    describe('F41 (ola 4, correcciones #2): asignación de plazos, asesores del proceso', () => {
      it('processAdvisorUserIds lee los userId de los asesores del proceso', async () => {
        await configure({
          legalProcesses: {
            getLegalProcess: jest.fn().mockReturnValue(of({ ...process, advisors: [advisor] })),
          },
        });
        const { component } = createComponent();

        expect(component.processAdvisorUserIds()).toEqual(['u1']);
      });

      it('asignar a un asesor relacionado con el proceso no pide confirmación', async () => {
        await configure({
          legalProcesses: {
            getLegalProcess: jest.fn().mockReturnValue(of({ ...process, advisors: [advisor] })),
          },
        });
        const { component } = createComponent();
        component.advisors.set([advisor]);

        await component.onDeadlineAssigneesChange(['u1']);

        expect(confirmDialogMock.confirm).not.toHaveBeenCalled();
        expect(component.deadlineForm.get('assigneeUserIds')?.value).toEqual(['u1']);
      });

      it('asignar a alguien no relacionado con el proceso pide confirmación y, si se acepta, aplica la selección', async () => {
        await configure({ confirmResolves: true });
        const { component } = createComponent();
        component.advisors.set([advisor]);

        await component.onDeadlineAssigneesChange(['u1']);

        expect(confirmDialogMock.confirm).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Asesor no relacionado con el proceso' }),
        );
        expect(component.deadlineForm.get('assigneeUserIds')?.value).toEqual(['u1']);
      });

      it('si se rechaza la confirmación, revierte a la selección anterior', async () => {
        await configure({ confirmResolves: false });
        const { component } = createComponent();
        component.advisors.set([advisor]);
        component.deadlineForm.patchValue({ assigneeUserIds: [] });

        await component.onDeadlineAssigneesChange(['u1']);

        expect(component.deadlineForm.get('assigneeUserIds')?.value).toEqual([]);
      });
    });

    it('openCreateDeadlineModal abre el modal y limpia el formulario/error previos', async () => {
      await configure();
      const { component } = createComponent();
      component.deadlineFormError.set('error previo');

      component.openCreateDeadlineModal();

      expect(component.createDeadlineModalOpen()).toBe(true);
      expect(component.deadlineFormError()).toBeNull();
      expect(component.deadlineForm.getRawValue().title).toBe('');
    });

    it('closeCreateDeadlineModal cierra el modal', async () => {
      await configure();
      const { component } = createComponent();
      component.openCreateDeadlineModal();

      component.closeCreateDeadlineModal();

      expect(component.createDeadlineModalOpen()).toBe(false);
    });

    it('submitCreateDeadline crea el plazo y navega a su ficha de edición (F41 rediseño 2026-09-23)', async () => {
      await configure();
      const { component, router } = createComponent();
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      component.deadlineForm.patchValue({ title: 'Audiencia', typeId: 'ty1', dueAt: '2026-03-01T10:00' });

      component.submitCreateDeadline();

      expect(deadlinesServiceMock.create).toHaveBeenCalledWith('p1', expect.objectContaining({ title: 'Audiencia' }));
      expect(toastMock.success).toHaveBeenCalled();
      expect(component.createDeadlineModalOpen()).toBe(false);
      expect(navigateSpy).toHaveBeenCalledWith(['/calendario/plazos', 'd1'], {
        queryParams: { returnTo: 'proceso', processId: 'p1', tab: 'plazos' },
      });
    });

    describe('edición (F41 ola 4, rediseño 2026-09-23)', () => {
      it('goToEditDeadline navega a la ficha de edición del plazo, con retorno a esta pestaña', async () => {
        await configure();
        const { component, router } = createComponent();
        const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

        component.goToEditDeadline(deadline);

        expect(navigateSpy).toHaveBeenCalledWith(['/calendario/plazos', 'd1'], {
          queryParams: { returnTo: 'proceso', processId: 'p1', tab: 'plazos' },
        });
      });

    });
  });

  describe('F41 (ola 4, rediseño 2026-09-23): retorno desde la ficha de un plazo (?tab=plazos)', () => {
    it('reabre la pestaña Plazos cuando se llega con ?tab=plazos', async () => {
      await configure({ queryParams: { tab: 'plazos' } });
      const { component } = createComponent();

      expect(component.activeTab()).toBe('plazos');
    });

    it('sin ?tab=plazos, la pestaña activa por defecto sigue siendo Datos', async () => {
      await configure();
      const { component } = createComponent();

      expect(component.activeTab()).toBe('datos');
    });
  });

  describe('tareas (F14)', () => {
    it('carga las tareas del proceso al iniciar', async () => {
      await configure();
      const { component } = createComponent();

      expect(tasksServiceMock.getForProcess).toHaveBeenCalledWith('p1');
      expect(component.processTasks().length).toBe(1);
    });

    it('submitTask crea la tarea vinculada al proceso actual', async () => {
      await configure();
      const { component } = createComponent();
      component.taskForm.patchValue({ title: 'Preparar poder' });

      component.submitTask();

      expect(tasksServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Preparar poder', processId: 'p1' }),
      );
    });
  });

  describe('anotaciones (HU-16)', () => {
    it('submitAnnotation crea la anotación y recarga el historial', async () => {
      await configure();
      const { component } = createComponent();
      component.annotationForm.patchValue({ description: 'Nota importante' });

      component.submitAnnotation();

      expect(processEventsServiceMock.createAnnotation).toHaveBeenCalledWith('p1', 'Nota importante', false);
      expect(toastMock.success).toHaveBeenCalledWith('Anotación creada correctamente.');
    });

    // F40 Ola 4a — ajuste 2026-09-21 (feedback punto 4): "Agregar anotación"
    // ya no es una pestaña, es una acción rápida de cabecera que abre
    // ProcessAnnotationModalComponent como overlay real.
    it('openAnnotationModal limpia el formulario y abre el modal', async () => {
      await configure();
      const { component } = createComponent();
      component.annotationForm.patchValue({ description: 'Borrador sin guardar' });
      component.annotationFiles.set([new File(['x'], 'a.txt')]);

      component.openAnnotationModal();

      expect(component.annotationModalOpen()).toBe(true);
      expect(component.annotationForm.value.description).toBe('');
      expect(component.annotationFiles()).toEqual([]);
    });

    it('closeAnnotationModal cierra el modal', async () => {
      await configure();
      const { component } = createComponent();
      component.openAnnotationModal();

      component.closeAnnotationModal();

      expect(component.annotationModalOpen()).toBe(false);
    });

    it('submitAnnotation exitoso cierra el modal', async () => {
      await configure();
      const { component } = createComponent();
      component.openAnnotationModal();
      component.annotationForm.patchValue({ description: 'Nota importante' });

      component.submitAnnotation();

      expect(component.annotationModalOpen()).toBe(false);
    });

    it('ya no existe una pestaña "anotaciones" en la ficha de proceso', async () => {
      await configure();
      const { component } = createComponent();

      const tabIds = component.tabs.map((tab) => tab.id as string);
      expect(tabIds).toEqual(['datos', 'contrapartes', 'plazos', 'tareas', 'historial']);
    });
  });

  describe('historial (HU-17)', () => {
    it('carga el historial del proceso al iniciar', async () => {
      await configure();
      const { component } = createComponent();

      expect(processEventsServiceMock.getProcessHistory).toHaveBeenCalledWith('p1');
      expect(component.processHistory()).toEqual([event]);
    });

    it('toggleEventVisibility actualiza el evento localmente', async () => {
      await configure();
      const { component } = createComponent();

      component.toggleEventVisibility({ eventId: 'ev1', visibleToClient: true });

      expect(processEventsServiceMock.setEventVisibility).toHaveBeenCalledWith('p1', 'ev1', true);
    });

    it('al eliminarse un archivo, recarga el historial del proceso actual', async () => {
      await configure();
      const { component } = createComponent();
      processEventsServiceMock.getProcessHistory.mockClear();

      filesServiceMock.fileDeleted$.next('f1');

      expect(processEventsServiceMock.getProcessHistory).toHaveBeenCalledWith('p1');
    });
  });
});
