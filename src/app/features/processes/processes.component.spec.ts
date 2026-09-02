import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';
import { ProcessesComponent } from './processes.component';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ProcessEventsService } from '../../core/services/process-events.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { ClientsService } from '../../core/services/clients.service';
import { CatalogsService } from '../../core/services/catalogs.service';
import { FilesService } from '../../core/services/files.service';
import { DeadlinesService } from '../../core/services/deadlines.service';
import { TasksService } from '../../core/services/tasks.service';
import { TaskStatusesService } from '../../core/services/task-statuses.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { PortalVisibilityPolicyService } from '../../core/services/portal-visibility-policy.service';
import { LegalProcessResponse, ProcessStatus } from '../../core/models/legal-process.model';
import { ProcessEvent, ProcessEventType } from '../../core/models/process-event.model';
import { PortalEventVisibilityMode, PortalEventVisibilityPolicy } from '../../core/models/portal-visibility-policy.model';
import { DeadlineResponse, DeadlineStatus } from '../../core/models/deadline.model';
import { TaskPriority, TaskResponse } from '../../core/models/task.model';
import { TaskStatusResponse } from '../../core/models/task-status.model';
import { FileModel } from '../../core/models/file.model';

describe('ProcessesComponent', () => {
  let legalProcessesServiceMock: {
    getLegalProcesses: jest.Mock;
    getLegalProcess: jest.Mock;
    createLegalProcess: jest.Mock;
    updateLegalProcess: jest.Mock;
    updateProcessStatus: jest.Mock;
    deleteLegalProcess: jest.Mock;
  };
  let processEventsServiceMock: {
    createAnnotation: jest.Mock;
    getProcessHistory: jest.Mock;
    setEventVisibility: jest.Mock;
  };
  let advisorsServiceMock: { getAdvisors: jest.Mock };
  let clientsServiceMock: { getClients: jest.Mock };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let filesServiceMock: {
    uploadFile: jest.Mock;
    downloadFile: jest.Mock;
    getDownloadUrl: jest.Mock;
    fileDeleted$: Subject<string>;
  };
  let deadlinesServiceMock: { getForProcess: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  let tasksServiceMock: {
    getForProcess: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    getTemplates: jest.Mock;
    instantiateTemplate: jest.Mock;
  };
  let taskStatusesServiceMock: { getAll: jest.Mock };
  let visibilityPolicyServiceMock: { getAll: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { success: jest.Mock; error: jest.Mock };
  let queryParamId: string | null;
  let navigateSpy: jest.SpyInstance;

  const process: LegalProcessResponse = {
    id: 'p1',
    title: 'Proceso de prueba',
    description: null,
    status: ProcessStatus.DRAFT,
    stage: null,
    riskLevel: null,
    court: null,
    caseNumber: null,
    nextHearingDate: null,
    startDate: null,
    endDate: null,
    companyId: 'c1',
    clientId: 'cl1',
    client: { id: 'cl1', fullName: 'Cliente Uno', email: 'cliente@lexar.com' },
    advisors: [],
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
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const taskStatus: TaskStatusResponse = {
    id: 'st1',
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

  const fileModel: FileModel = {
    id: 'f1',
    key: 'key-1',
    bucket: 'bucket-1',
    originalFilename: 'evidencia.pdf',
    contentType: 'application/pdf',
    size: 1024,
    formattedSize: '1 KB',
    entityType: 'legal_process',
    entityId: 'p1',
    metadata: null,
    uploadedBy: { id: 'u1', email: 'ana@lexar.com' },
    isPreviewable: true,
    isImage: false,
    isPdf: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  function configure(overrides: {
    legalProcesses?: Partial<typeof legalProcessesServiceMock>;
    processEvents?: Partial<typeof processEventsServiceMock>;
    files?: Partial<typeof filesServiceMock>;
    deadlines?: Partial<typeof deadlinesServiceMock>;
    tasks?: Partial<typeof tasksServiceMock>;
    visibilityPolicies?: PortalEventVisibilityPolicy[];
    confirmResolves?: boolean;
    queryParamId?: string | null;
  } = {}) {
    queryParamId = overrides.queryParamId ?? null;

    legalProcessesServiceMock = {
      getLegalProcesses: jest
        .fn()
        .mockReturnValue(of({ message: 'ok', legalProcesses: [process], total: 1, page: 1, limit: 10 })),
      getLegalProcess: jest.fn().mockReturnValue(of(process)),
      createLegalProcess: jest.fn().mockReturnValue(of(process)),
      updateLegalProcess: jest.fn().mockReturnValue(of(process)),
      updateProcessStatus: jest.fn().mockReturnValue(of(process)),
      deleteLegalProcess: jest.fn().mockReturnValue(of(undefined)),
      ...overrides.legalProcesses,
    };

    processEventsServiceMock = {
      createAnnotation: jest.fn().mockReturnValue(of(event)),
      getProcessHistory: jest.fn().mockReturnValue(of([event])),
      setEventVisibility: jest.fn().mockReturnValue(of(event)),
      ...overrides.processEvents,
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

    filesServiceMock = {
      uploadFile: jest.fn().mockReturnValue(of(fileModel)),
      downloadFile: jest.fn().mockReturnValue(of(undefined)),
      getDownloadUrl: jest
        .fn()
        .mockReturnValue(of({ url: 'https://s3/x', filename: 'evidencia.pdf', contentType: 'application/pdf', expiresIn: 300 })),
      fileDeleted$: new Subject<string>(),
      ...overrides.files,
    };

    deadlinesServiceMock = {
      getForProcess: jest.fn().mockReturnValue(of([deadline])),
      create: jest.fn().mockReturnValue(of(deadline)),
      update: jest.fn().mockReturnValue(of(deadline)),
      delete: jest.fn().mockReturnValue(of(undefined)),
      ...overrides.deadlines,
    };

    tasksServiceMock = {
      getForProcess: jest.fn().mockReturnValue(of([buildTask()])),
      create: jest.fn().mockReturnValue(of(buildTask())),
      delete: jest.fn().mockReturnValue(of(undefined)),
      getTemplates: jest.fn().mockReturnValue(of([])),
      instantiateTemplate: jest.fn().mockReturnValue(of([buildTask(), buildTask({ id: 't2' })])),
      ...overrides.tasks,
    };

    taskStatusesServiceMock = { getAll: jest.fn().mockReturnValue(of([taskStatus])) };

    visibilityPolicyServiceMock = {
      getAll: jest.fn().mockReturnValue(of(overrides.visibilityPolicies ?? [])),
    };

    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(overrides.confirmResolves ?? true) };
    toastMock = { success: jest.fn(), error: jest.fn() };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => queryParamId } },
    };

    const sanitizerMock = {
      bypassSecurityTrustResourceUrl: jest.fn((url: string): SafeResourceUrl => url as unknown as SafeResourceUrl),
    };

    return TestBed.configureTestingModule({
      imports: [ProcessesComponent],
      providers: [
        provideRouter([]),
        { provide: DomSanitizer, useValue: sanitizerMock },
        { provide: LegalProcessesService, useValue: legalProcessesServiceMock },
        { provide: ProcessEventsService, useValue: processEventsServiceMock },
        { provide: AdvisorsService, useValue: advisorsServiceMock },
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: FilesService, useValue: filesServiceMock },
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TaskStatusesService, useValue: taskStatusesServiceMock },
        { provide: PortalVisibilityPolicyService, useValue: visibilityPolicyServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
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
      expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('deadline_type');
      expect(taskStatusesServiceMock.getAll).toHaveBeenCalled();
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

    it('al cerrar, resetea el formulario y el proceso en edición', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set(process);
      component.panelOpen.set(true);
      component.processForm.get('caseNumber')?.disable();

      component.togglePanel();

      expect(component.panelOpen()).toBe(false);
      expect(component.editingProcess()).toBeNull();
      expect(component.processForm.value.title).toBe('');
      expect(component.processForm.get('caseNumber')?.disabled).toBe(false);
    });
  });

  describe('submitProcess', () => {
    it('con formulario inválido, marca error y no llama al servicio', async () => {
      await configure();
      const component = createComponent();

      component.submitProcess();

      expect(component.formError()).toBe('Completa los campos obligatorios.');
      expect(legalProcessesServiceMock.createLegalProcess).not.toHaveBeenCalled();
    });

    it('crea un proceso nuevo con status DRAFT cuando no hay proceso en edición', async () => {
      await configure();
      const component = createComponent();
      component.panelOpen.set(true);
      component.processForm.patchValue({
        title: 'Nuevo proceso',
        clientId: 'cl1',
        stageId: 'st1',
        riskLevelId: 'rl1',
      });

      component.submitProcess();

      expect(legalProcessesServiceMock.createLegalProcess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Nuevo proceso', clientId: 'cl1', status: ProcessStatus.DRAFT }),
      );
      expect(component.isLoading()).toBe(false);
      expect(component.panelOpen()).toBe(false);
    });

    it('actualiza un proceso existente sin enviar status', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set(process);
      component.processForm.patchValue({
        title: 'Editado',
        clientId: 'cl1',
        stageId: 'st1',
        riskLevelId: 'rl1',
      });

      component.submitProcess();

      expect(legalProcessesServiceMock.updateLegalProcess).toHaveBeenCalledWith(
        'p1',
        expect.not.objectContaining({ status: expect.anything() }),
      );
    });

    // BUG-10: legalProcessesService.createLegalProcess()/updateLegalProcess()
    // ya envuelven el error en un Error nativo con el mensaje real — .error
    // no existe ahí. El mock refleja esa forma real, no la forma cruda del
    // interceptor (que nunca llega así hasta el componente).
    it('en error, expone el mensaje real en el form y en el toast', async () => {
      await configure({
        legalProcesses: {
          createLegalProcess: jest
            .fn()
            .mockReturnValue(throwError(() => new Error('Cliente inválido'))),
        },
      });
      const component = createComponent();
      component.processForm.patchValue({ title: 'x', clientId: 'cl1', stageId: 's1', riskLevelId: 'r1' });

      component.submitProcess();

      expect(component.formError()).toBe('Cliente inválido');
      expect(toastMock.error).toHaveBeenCalledWith('Cliente inválido');
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('editProcess y configureEditableFields', () => {
    it('carga los valores del proceso en el formulario y abre el panel', async () => {
      await configure();
      const component = createComponent();

      component.editProcess({ ...process, description: 'Desc', caseNumber: 'PROC-1' });

      expect(component.editingProcess()?.id).toBe('p1');
      expect(component.processForm.value.title).toBe('Proceso de prueba');
      expect(component.processForm.value.caseNumber).toBe('PROC-1');
      expect(component.panelOpen()).toBe(true);
    });

    it('en ACTIVE, deshabilita caseNumber y clientId', async () => {
      await configure();
      const component = createComponent();

      component.configureEditableFields(ProcessStatus.ACTIVE);

      expect(component.processForm.get('caseNumber')?.disabled).toBe(true);
      expect(component.processForm.get('clientId')?.disabled).toBe(true);
      expect(component.processForm.get('stageId')?.disabled).toBe(false);
    });

    it('en UNDER_REVIEW, además deshabilita status', async () => {
      await configure();
      const component = createComponent();

      component.configureEditableFields(ProcessStatus.UNDER_REVIEW);

      expect(component.processForm.get('status')?.disabled).toBe(true);
    });

    it('en SUSPENDED, además deshabilita stageId', async () => {
      await configure();
      const component = createComponent();

      component.configureEditableFields(ProcessStatus.SUSPENDED);

      expect(component.processForm.get('stageId')?.disabled).toBe(true);
    });

    it('en estados finales, deshabilita todos los campos', async () => {
      await configure();
      const component = createComponent();

      component.configureEditableFields(ProcessStatus.ARCHIVED);

      Object.keys(component.processForm.controls).forEach((key) => {
        expect(component.processForm.get(key)?.disabled).toBe(true);
      });
    });
  });

  describe('canEditProcess / validNextStatuses / processStatusMessage', () => {
    it('sin proceso en edición, siempre es editable', async () => {
      await configure();
      const component = createComponent();

      expect(component.canEditProcess()).toBe(true);
    });

    it('calcula los estados siguientes válidos del proceso en edición', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set({ ...process, status: ProcessStatus.ACTIVE });

      expect(component.validNextStatuses()).toEqual([
        ProcessStatus.UNDER_REVIEW,
        ProcessStatus.SUSPENDED,
        ProcessStatus.CANCELLED,
      ]);
    });

    it('devuelve el mensaje de advertencia según el estado', async () => {
      await configure();
      const component = createComponent();

      component.editingProcess.set({ ...process, status: ProcessStatus.COMPLETED });
      expect(component.processStatusMessage()).toContain('completado');

      component.editingProcess.set(null);
      expect(component.processStatusMessage()).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('sin proceso en edición o formulario inválido, no llama al servicio', async () => {
      await configure();
      const component = createComponent();
      component.statusForm.get('status')?.setValue(null as unknown as ProcessStatus);

      await component.updateStatus();

      expect(legalProcessesServiceMock.updateProcessStatus).not.toHaveBeenCalled();
    });

    it('en transición final (sin más transiciones posibles), pide confirmación antes de continuar', async () => {
      await configure({ confirmResolves: true });
      const component = createComponent();
      component.editingProcess.set({ ...process, status: ProcessStatus.UNDER_REVIEW });
      component.statusForm.patchValue({ status: ProcessStatus.CANCELLED, notes: '' });

      await component.updateStatus();

      expect(confirmDialogMock.confirm).toHaveBeenCalled();
      expect(legalProcessesServiceMock.updateProcessStatus).toHaveBeenCalledWith('p1', {
        status: ProcessStatus.CANCELLED,
        notes: '',
      });
    });

    it('si el usuario cancela la confirmación, no actualiza el estado', async () => {
      await configure({ confirmResolves: false });
      const component = createComponent();
      component.editingProcess.set({ ...process, status: ProcessStatus.UNDER_REVIEW });
      component.statusForm.patchValue({ status: ProcessStatus.CANCELLED, notes: '' });

      await component.updateStatus();

      expect(legalProcessesServiceMock.updateProcessStatus).not.toHaveBeenCalled();
    });

    it('en transiciones no finales, actualiza sin pedir confirmación', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set({ ...process, status: ProcessStatus.DRAFT });
      component.statusForm.patchValue({ status: ProcessStatus.ACTIVE, notes: '' });

      await component.updateStatus();

      expect(confirmDialogMock.confirm).not.toHaveBeenCalled();
      expect(legalProcessesServiceMock.updateProcessStatus).toHaveBeenCalled();
      expect(component.statusModalOpen()).toBe(false);
    });

    // BUG-10: legalProcessesService.updateProcessStatus() ya envuelve el
    // error del interceptor en un Error nativo (new Error(mensaje real)) —
    // .error no existe ahí. El mock refleja esa forma real, no
    // { error: { message } } (la forma cruda del interceptor, que nunca
    // llega así hasta el componente).
    it('en error, expone el mensaje real en el form y en el toast', async () => {
      await configure({
        legalProcesses: {
          updateProcessStatus: jest
            .fn()
            .mockReturnValue(throwError(() => new Error('Transición inválida'))),
        },
      });
      const component = createComponent();
      component.editingProcess.set({ ...process, status: ProcessStatus.DRAFT });
      component.statusForm.patchValue({ status: ProcessStatus.ACTIVE, notes: '' });

      await component.updateStatus();

      expect(component.formError()).toBe('Transición inválida');
      expect(toastMock.error).toHaveBeenCalledWith('Transición inválida');
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

  describe('toggleAdvisor y generateCaseNumber', () => {
    it('agrega el id si no está seleccionado y lo quita si ya estaba', async () => {
      await configure();
      const component = createComponent();

      component.toggleAdvisor('adv1');
      expect(component.processForm.value.advisorIds).toEqual(['adv1']);

      component.toggleAdvisor('adv1');
      expect(component.processForm.value.advisorIds).toEqual([]);
    });

    it('genera un número de caso con el formato PROC-YYYY-NNNNNN', async () => {
      await configure();
      const component = createComponent();

      component.generateCaseNumber();

      expect(component.processForm.value.caseNumber).toMatch(/^PROC-\d{4}-\d{6}$/);
    });
  });

  describe('HU-16 anotaciones', () => {
    it('openAnnotationModal resetea el formulario y los archivos', async () => {
      await configure();
      const component = createComponent();

      component.openAnnotationModal(process);

      expect(component.annotationModalOpen()).toBe(true);
      expect(component.editingProcess()?.id).toBe('p1');
      expect(component.annotationFiles()).toEqual([]);
    });

    it('onAnnotationFilesSelected agrega los archivos elegidos', async () => {
      await configure();
      const component = createComponent();
      const file = new File(['contenido'], 'evidencia.pdf', { type: 'application/pdf' });
      const fileSelectEvent = { target: { files: [file] } } as unknown as Event;

      component.onAnnotationFilesSelected(fileSelectEvent);

      expect(component.annotationFiles()).toEqual([file]);
    });

    it('removeAnnotationFile quita el archivo en el índice dado', async () => {
      await configure();
      const component = createComponent();
      const fileA = new File(['a'], 'a.pdf');
      const fileB = new File(['b'], 'b.pdf');
      component.annotationFiles.set([fileA, fileB]);

      component.removeAnnotationFile(0);

      expect(component.annotationFiles()).toEqual([fileB]);
    });

    it('submitAnnotation sin proceso en edición no hace nada', async () => {
      await configure();
      const component = createComponent();
      component.annotationForm.patchValue({ description: 'algo' });

      component.submitAnnotation();

      expect(processEventsServiceMock.createAnnotation).not.toHaveBeenCalled();
    });

    it('submitAnnotation crea la anotación y sube los archivos adjuntos', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set(process);
      component.annotationForm.patchValue({ description: 'Nota importante' });
      const file = new File(['contenido'], 'evidencia.pdf', { type: 'application/pdf' });
      component.annotationFiles.set([file]);

      component.submitAnnotation();

      expect(processEventsServiceMock.createAnnotation).toHaveBeenCalledWith('p1', 'Nota importante', false);
      expect(filesServiceMock.uploadFile).toHaveBeenCalledWith(file, 'legal_process', 'p1', undefined, 'ev1');
      expect(component.isLoading()).toBe(false);
      expect(component.annotationModalOpen()).toBe(false);
      expect(toastMock.success).toHaveBeenCalledWith('Anotación creada correctamente.');
    });

    it('submitAnnotation sin archivos no sube nada', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set(process);
      component.annotationForm.patchValue({ description: 'Nota sin adjuntos' });

      component.submitAnnotation();

      expect(processEventsServiceMock.createAnnotation).toHaveBeenCalled();
      expect(filesServiceMock.uploadFile).not.toHaveBeenCalled();
    });

    it('submitAnnotation en error expone el mensaje del backend', async () => {
      await configure({
        processEvents: {
          createAnnotation: jest.fn().mockReturnValue(throwError(() => ({ message: 'Nota inválida' }))),
        },
      });
      const component = createComponent();
      component.editingProcess.set(process);
      component.annotationForm.patchValue({ description: 'x' });

      component.submitAnnotation();

      expect(component.formError()).toBe('Nota inválida');
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('HU-17 historial', () => {
    it('openHistoryModal carga el historial del proceso', async () => {
      await configure();
      const component = createComponent();

      component.openHistoryModal(process);

      expect(component.historyModalOpen()).toBe(true);
      expect(processEventsServiceMock.getProcessHistory).toHaveBeenCalledWith('p1');
      expect(component.processHistory()).toEqual([event]);
      expect(component.isLoadingHistory()).toBe(false);
    });

    it('closeHistoryModal limpia el estado', async () => {
      await configure();
      const component = createComponent();
      component.openHistoryModal(process);

      component.closeHistoryModal();

      expect(component.historyModalOpen()).toBe(false);
      expect(component.editingProcess()).toBeNull();
      expect(component.processHistory()).toEqual([]);
    });

    it('loadProcessHistory en error apaga isLoadingHistory sin romper', async () => {
      await configure({
        processEvents: { getProcessHistory: jest.fn().mockReturnValue(throwError(() => new Error('falló'))) },
      });
      const component = createComponent();

      component.loadProcessHistory('p1');

      expect(component.isLoadingHistory()).toBe(false);
    });

    it('toggleEventVisibility actualiza el evento en la lista local', async () => {
      await configure();
      const component = createComponent();
      component.openHistoryModal(process);

      component.toggleEventVisibility({ eventId: 'ev1', visibleToClient: true });

      expect(processEventsServiceMock.setEventVisibility).toHaveBeenCalledWith('p1', 'ev1', true);
      expect(component.processHistory()[0].visibleToClient).toBe(true);
    });

    it('toggleEventVisibility sin proceso en edición no llama al servicio', async () => {
      await configure();
      const component = createComponent();

      component.toggleEventVisibility({ eventId: 'ev1', visibleToClient: true });

      expect(processEventsServiceMock.setEventVisibility).not.toHaveBeenCalled();
    });
  });

  describe('F27 política de visibilidad del portal', () => {
    it('carga la política al construirse', async () => {
      await configure();
      createComponent();

      expect(visibilityPolicyServiceMock.getAll).toHaveBeenCalled();
    });

    it('annotationVisibilityMode expone el modo de ANNOTATION cargado', async () => {
      const policies: PortalEventVisibilityPolicy[] = [
        { eventType: ProcessEventType.ANNOTATION, mode: PortalEventVisibilityMode.DEFAULT_ON, allowsAlways: false },
        { eventType: ProcessEventType.STATUS_CHANGE, mode: PortalEventVisibilityMode.ALWAYS, allowsAlways: true },
      ];
      await configure({ visibilityPolicies: policies });
      const component = createComponent();

      expect(component.annotationVisibilityMode()).toBe(PortalEventVisibilityMode.DEFAULT_ON);
    });

    it('annotationVisibilityMode es null si aún no hay política cargada para ANNOTATION', async () => {
      await configure({ visibilityPolicies: [] });
      const component = createComponent();

      expect(component.annotationVisibilityMode()).toBeNull();
    });

    it('submitAnnotation envía markAsInternal cuando el usuario lo marca', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set(process);
      component.annotationForm.patchValue({ description: 'Nota interna', markAsInternal: true });

      component.submitAnnotation();

      expect(processEventsServiceMock.createAnnotation).toHaveBeenCalledWith('p1', 'Nota interna', true);
    });
  });

  describe('F13 plazos', () => {
    it('openDeadlinesModal resetea el formulario y carga los plazos', async () => {
      await configure();
      const component = createComponent();

      component.openDeadlinesModal(process);

      expect(component.deadlinesModalOpen()).toBe(true);
      expect(deadlinesServiceMock.getForProcess).toHaveBeenCalledWith('p1');
      expect(component.processDeadlines()).toEqual([deadline]);
    });

    it('loadProcessDeadlines en error muestra un toast', async () => {
      await configure({
        deadlines: { getForProcess: jest.fn().mockReturnValue(throwError(() => new Error('falló'))) },
      });
      const component = createComponent();

      component.loadProcessDeadlines('p1');

      expect(toastMock.error).toHaveBeenCalledWith('Error al cargar los plazos del proceso');
      expect(component.isLoadingDeadlines()).toBe(false);
    });

    it('toggleDeadlineAssignee agrega y quita ids', async () => {
      await configure();
      const component = createComponent();

      component.toggleDeadlineAssignee('u1');
      expect(component.deadlineForm.value.assigneeUserIds).toEqual(['u1']);

      component.toggleDeadlineAssignee('u1');
      expect(component.deadlineForm.value.assigneeUserIds).toEqual([]);
    });

    it('submitDeadline con formulario inválido no llama al servicio', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set(process);

      component.submitDeadline();

      expect(component.deadlineFormError()).toBe('Completa los campos obligatorios.');
      expect(deadlinesServiceMock.create).not.toHaveBeenCalled();
    });

    it('submitDeadline crea el plazo y refresca listado y procesos', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set(process);
      component.deadlineForm.patchValue({
        title: 'Audiencia',
        typeId: 'type1',
        dueAt: '2026-02-01T10:00',
        allDay: false,
      });

      component.submitDeadline();

      expect(deadlinesServiceMock.create).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ title: 'Audiencia', typeId: 'type1' }),
      );
      expect(toastMock.success).toHaveBeenCalledWith('Plazo creado correctamente.');
      expect(component.isSubmittingDeadline()).toBe(false);
    });

    it('submitDeadline en error muestra el mensaje en el form y en el toast', async () => {
      await configure({
        deadlines: { create: jest.fn().mockReturnValue(throwError(() => new Error('Fecha inválida'))) },
      });
      const component = createComponent();
      component.editingProcess.set(process);
      component.deadlineForm.patchValue({ title: 'Audiencia', typeId: 'type1', dueAt: '2026-02-01T10:00' });

      component.submitDeadline();

      expect(component.deadlineFormError()).toBe('Fecha inválida');
      expect(toastMock.error).toHaveBeenCalledWith('Fecha inválida');
    });

    it('markDeadlineDone marca el plazo como completado', async () => {
      await configure();
      const component = createComponent();

      component.markDeadlineDone(deadline);

      expect(deadlinesServiceMock.update).toHaveBeenCalledWith('d1', { status: DeadlineStatus.DONE });
      expect(toastMock.success).toHaveBeenCalledWith('Plazo marcado como completado.');
    });

    it('deleteDeadlineItem no elimina si el usuario cancela', async () => {
      await configure({ confirmResolves: false });
      const component = createComponent();

      await component.deleteDeadlineItem(deadline);

      expect(deadlinesServiceMock.delete).not.toHaveBeenCalled();
    });

    it('deleteDeadlineItem elimina si el usuario confirma', async () => {
      await configure({ confirmResolves: true });
      const component = createComponent();

      await component.deleteDeadlineItem(deadline);

      expect(deadlinesServiceMock.delete).toHaveBeenCalledWith('d1');
      expect(toastMock.success).toHaveBeenCalledWith('Plazo eliminado correctamente.');
    });
  });

  describe('F14 tareas', () => {
    it('openTasksModal resetea el formulario y carga las tareas', async () => {
      await configure();
      const component = createComponent();

      component.openTasksModal(process);

      expect(component.tasksModalOpen()).toBe(true);
      expect(tasksServiceMock.getForProcess).toHaveBeenCalledWith('p1');
      expect(component.processTasks().length).toBe(1);
    });

    it('loadProcessTasks en error muestra un toast', async () => {
      await configure({ tasks: { getForProcess: jest.fn().mockReturnValue(throwError(() => new Error('falló'))) } });
      const component = createComponent();

      component.loadProcessTasks('p1');

      expect(toastMock.error).toHaveBeenCalledWith('Error al cargar las tareas del proceso');
    });

    it('submitTask con formulario inválido no llama al servicio', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set(process);

      component.submitTask();

      expect(component.taskFormError()).toBe('Completa los campos obligatorios.');
      expect(tasksServiceMock.create).not.toHaveBeenCalled();
    });

    it('submitTask crea la tarea y refresca el listado', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set(process);
      component.taskForm.patchValue({ title: 'Nueva tarea' });

      component.submitTask();

      expect(tasksServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Nueva tarea', processId: 'p1' }),
      );
      expect(toastMock.success).toHaveBeenCalledWith('Tarea creada correctamente.');
    });

    it('submitTask en error muestra el mensaje en el form y en el toast', async () => {
      await configure({ tasks: { create: jest.fn().mockReturnValue(throwError(() => new Error('Título duplicado'))) } });
      const component = createComponent();
      component.editingProcess.set(process);
      component.taskForm.patchValue({ title: 'Nueva tarea' });

      component.submitTask();

      expect(component.taskFormError()).toBe('Título duplicado');
      expect(toastMock.error).toHaveBeenCalledWith('Título duplicado');
    });

    it('onProcessTaskUpdated reemplaza la tarea actualizada en la lista', async () => {
      await configure();
      const component = createComponent();
      component.processTasks.set([buildTask({ id: 't1', title: 'Original' })]);

      component.onProcessTaskUpdated(buildTask({ id: 't1', title: 'Actualizada' }));

      expect(component.processTasks()[0].title).toBe('Actualizada');
    });

    it('deleteTaskItem no hace nada si la tarea está en estado terminal', async () => {
      await configure();
      const component = createComponent();

      await component.deleteTaskItem(buildTask({ status: { ...taskStatus, isTerminal: true } }));

      expect(confirmDialogMock.confirm).not.toHaveBeenCalled();
      expect(tasksServiceMock.delete).not.toHaveBeenCalled();
    });

    it('deleteTaskItem elimina la tarea si el usuario confirma', async () => {
      await configure({ confirmResolves: true });
      const component = createComponent();

      await component.deleteTaskItem(buildTask());

      expect(tasksServiceMock.delete).toHaveBeenCalledWith('t1');
      expect(toastMock.success).toHaveBeenCalledWith('Tarea eliminada correctamente.');
    });

    it('instantiateTaskTemplate crea tareas desde la plantilla y notifica la cantidad', async () => {
      await configure();
      const component = createComponent();
      component.editingProcess.set(process);

      component.instantiateTaskTemplate('tpl1');

      expect(tasksServiceMock.instantiateTemplate).toHaveBeenCalledWith('p1', 'tpl1');
      expect(toastMock.success).toHaveBeenCalledWith('Se crearon 2 tarea(s) desde la plantilla.');
      expect(component.isInstantiatingTemplate()).toBe(false);
    });

    it('instantiateTaskTemplate en error muestra un toast', async () => {
      await configure({
        tasks: { instantiateTemplate: jest.fn().mockReturnValue(throwError(() => new Error('Plantilla no encontrada'))) },
      });
      const component = createComponent();
      component.editingProcess.set(process);

      component.instantiateTaskTemplate('tpl1');

      expect(toastMock.error).toHaveBeenCalledWith('Plantilla no encontrada');
      expect(component.isInstantiatingTemplate()).toBe(false);
    });
  });

  describe('archivos: descarga y previsualización', () => {
    it('downloadFile en error muestra un toast (BUG-20: ya no usa alert nativo)', async () => {
      await configure({ files: { downloadFile: jest.fn().mockReturnValue(throwError(() => new Error('falló'))) } });
      const component = createComponent();

      component.downloadFile('f1');

      expect(toastMock.error).toHaveBeenCalledWith('falló');
    });

    it('previewFileFromHistory reconoce un PDF', async () => {
      await configure();
      const component = createComponent();

      component.previewFileFromHistory('f1', 'contrato.pdf');

      expect(component.previewingFile()).toEqual(
        expect.objectContaining({ id: 'f1', originalFilename: 'contrato.pdf', isPdf: true, isImage: false }),
      );
      expect(component.previewUrl()).toBe('https://s3/x');
    });

    it('previewFileFromHistory reconoce una imagen', async () => {
      await configure({
        files: {
          getDownloadUrl: jest
            .fn()
            .mockReturnValue(of({ url: 'https://s3/img', filename: 'foto.png', contentType: 'image/png', expiresIn: 300 })),
        },
      });
      const component = createComponent();

      component.previewFileFromHistory('f2', 'foto.png');

      expect(component.previewingFile()?.isImage).toBe(true);
      expect(component.previewingFile()?.isPdf).toBe(false);
    });

    it('previewFileFromHistory en error muestra un toast (BUG-20: ya no usa alert nativo)', async () => {
      await configure({ files: { getDownloadUrl: jest.fn().mockReturnValue(throwError(() => new Error('falló'))) } });
      const component = createComponent();

      component.previewFileFromHistory('f1', 'contrato.pdf');

      expect(toastMock.error).toHaveBeenCalledWith('falló');
    });

    it('closePreviewModal limpia el archivo y la url en vista previa', async () => {
      await configure();
      const component = createComponent();
      component.previewFileFromHistory('f1', 'contrato.pdf');

      component.closePreviewModal();

      expect(component.previewingFile()).toBeNull();
      expect(component.previewUrl()).toBeNull();
    });
  });

  describe('ngOnInit / openFromQueryParam', () => {
    it('sin openId en la ruta, no busca ningún proceso', async () => {
      await configure({ queryParamId: null });
      createComponent();

      expect(legalProcessesServiceMock.getLegalProcess).not.toHaveBeenCalled();
    });

    it('con openId en la ruta, abre el proceso encontrado y limpia el query param', async () => {
      await configure({ queryParamId: 'p1' });
      const component = createComponent();

      expect(legalProcessesServiceMock.getLegalProcess).toHaveBeenCalledWith('p1');
      expect(component.editingProcess()?.id).toBe('p1');
      expect(component.panelOpen()).toBe(true);
      expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {}, replaceUrl: true }));
    });

    it('al eliminarse un archivo mientras el historial está abierto, recarga el historial', async () => {
      await configure();
      const component = createComponent();
      component.openHistoryModal(process);
      processEventsServiceMock.getProcessHistory.mockClear();

      filesServiceMock.fileDeleted$.next('f1');

      expect(processEventsServiceMock.getProcessHistory).toHaveBeenCalledWith('p1');
    });

    it('al eliminarse un archivo con el historial cerrado, no recarga nada', async () => {
      await configure();
      const component = createComponent();
      processEventsServiceMock.getProcessHistory.mockClear();

      filesServiceMock.fileDeleted$.next('f1');

      expect(processEventsServiceMock.getProcessHistory).not.toHaveBeenCalled();
      expect(component.historyModalOpen()).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    it('cancela la suscripción a fileDeleted$ al destruirse', async () => {
      await configure();
      const fixture = TestBed.createComponent(ProcessesComponent);
      fixture.detectChanges();
      fixture.componentInstance.openHistoryModal(process);
      processEventsServiceMock.getProcessHistory.mockClear();

      fixture.destroy();
      filesServiceMock.fileDeleted$.next('f1');

      expect(processEventsServiceMock.getProcessHistory).not.toHaveBeenCalled();
    });
  });
});
