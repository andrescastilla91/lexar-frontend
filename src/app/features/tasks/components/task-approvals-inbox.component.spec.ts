import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { TaskApprovalsInboxComponent } from './task-approvals-inbox.component';
import { TaskApprovalsService } from '../../../core/services/task-approvals.service';
import { FilesService } from '../../../core/services/files.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { TaskApprovalRequestResponse } from '../../../core/models/task-approval.model';
import { TaskResponse } from '../../../core/models/task.model';

describe('TaskApprovalsInboxComponent', () => {
  let taskApprovalsServiceMock: {
    listPending: jest.Mock;
    decide: jest.Mock;
  };
  let filesServiceMock: { downloadFile: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { success: jest.Mock; error: jest.Mock };

  function buildApproval(
    overrides: Partial<TaskApprovalRequestResponse> = {},
  ): TaskApprovalRequestResponse {
    return {
      id: 'appr-1',
      taskId: 'task-1',
      taskTitle: 'Revisar contrato',
      processId: null,
      processTitle: null,
      fromStatusLabel: 'En progreso',
      toStatusLabel: 'Terminada',
      requestedBy: { id: 'u1', firstName: 'Ana', lastName: 'Gómez' },
      note: null,
      attachments: [],
      status: 'PENDING',
      decidedBy: null,
      decidedAt: null,
      decisionNote: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      ...overrides,
    };
  }

  function configure(overrides: {
    listPending?: jest.Mock;
    decide?: jest.Mock;
  } = {}) {
    taskApprovalsServiceMock = {
      listPending: overrides.listPending ?? jest.fn().mockReturnValue(of([buildApproval()])),
      decide: overrides.decide ?? jest.fn().mockReturnValue(of(null as TaskResponse | null)),
    };
    filesServiceMock = { downloadFile: jest.fn().mockReturnValue(of(undefined)) };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastMock = { success: jest.fn(), error: jest.fn() };

    return TestBed.configureTestingModule({
      imports: [TaskApprovalsInboxComponent],
      providers: [
        { provide: TaskApprovalsService, useValue: taskApprovalsServiceMock },
        { provide: FilesService, useValue: filesServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();
  }

  function createComponent() {
    const fixture = TestBed.createComponent(TaskApprovalsInboxComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('al iniciar, carga las aprobaciones pendientes', async () => {
    await configure();
    const component = createComponent();

    expect(taskApprovalsServiceMock.listPending).toHaveBeenCalled();
    expect(component.approvals()).toEqual([buildApproval()]);
    expect(component.isLoading()).toBe(false);
  });

  it('en error de carga, muestra el toast y termina el loading', async () => {
    await configure({
      listPending: jest.fn().mockReturnValue(throwError(() => new Error('No se pudo cargar'))),
    });
    const component = createComponent();

    expect(component.isLoading()).toBe(false);
    expect(component.approvals()).toEqual([]);
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo cargar');
  });

  it('downloadAttachment descarga el archivo por id', async () => {
    await configure();
    const component = createComponent();

    component.downloadAttachment('file-1');

    expect(filesServiceMock.downloadFile).toHaveBeenCalledWith('file-1');
  });

  it('approve en éxito quita el ítem del listado, notifica y emite decided', async () => {
    await configure();
    const component = createComponent();
    const decidedSpy = jest.fn();
    component.decided.subscribe(decidedSpy);
    const item = buildApproval();

    component.approve(item);

    expect(taskApprovalsServiceMock.decide).toHaveBeenCalledWith('appr-1', { approve: true });
    expect(component.approvals()).toEqual([]);
    expect(component.isDeciding().has('appr-1')).toBe(false);
    expect(toastMock.success).toHaveBeenCalledWith('Solicitud aprobada correctamente.');
    expect(decidedSpy).toHaveBeenCalled();
  });

  it('approve en error mantiene el ítem, limpia isDeciding y no emite decided', async () => {
    await configure({
      decide: jest.fn().mockReturnValue(throwError(() => new Error('Error al decidir'))),
    });
    const component = createComponent();
    const decidedSpy = jest.fn();
    component.decided.subscribe(decidedSpy);
    const item = buildApproval();

    component.approve(item);

    expect(component.approvals()).toEqual([item]);
    expect(component.isDeciding().has('appr-1')).toBe(false);
    expect(toastMock.error).toHaveBeenCalledWith('Error al decidir');
    expect(decidedSpy).not.toHaveBeenCalled();
  });

  it('isDeciding marca el ítem mientras la decisión está en curso', async () => {
    const decideSubject = new Subject<TaskResponse | null>();
    await configure({ decide: jest.fn().mockReturnValue(decideSubject.asObservable()) });
    const component = createComponent();
    const item = buildApproval();

    component.approve(item);

    expect(component.isDeciding().has('appr-1')).toBe(true);

    decideSubject.next(null);
    decideSubject.complete();

    expect(component.isDeciding().has('appr-1')).toBe(false);
  });

  it('reject sin confirmar no llama al servicio de decisión', async () => {
    await configure();
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    await component.reject(buildApproval());

    expect(taskApprovalsServiceMock.decide).not.toHaveBeenCalled();
  });

  it('reject confirmado decide con approve:false y notifica el rechazo', async () => {
    await configure();
    const component = createComponent();

    await component.reject(buildApproval());

    expect(confirmDialogMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ danger: true }),
    );
    expect(taskApprovalsServiceMock.decide).toHaveBeenCalledWith('appr-1', { approve: false });
    expect(toastMock.success).toHaveBeenCalledWith('Solicitud rechazada.');
  });
});
