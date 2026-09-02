import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskApprovalsService } from './task-approvals.service';
import { TaskApprovalRequestResponse } from '../models/task-approval.model';
import { TaskPriority, TaskResponse } from '../models/task.model';
import { environment } from '../../../environments/environment';

import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('TaskApprovalsService', () => {
  let service: TaskApprovalsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/task-approvals`;

  const approval: TaskApprovalRequestResponse = {
    id: 'approval-1',
    taskId: 'task-1',
    taskTitle: 'Revisar contrato',
    processId: 'process-1',
    processTitle: 'Proceso X',
    fromStatusLabel: 'En curso',
    toStatusLabel: 'Completada',
    requestedBy: { id: 'user-1', firstName: 'Ana', lastName: 'Ríos' },
    note: 'Listo para revisión',
    attachments: [],
    status: 'PENDING',
    decidedBy: null,
    decidedAt: null,
    decisionNote: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const task: TaskResponse = {
    id: 'task-1',
    title: 'Revisar contrato',
    description: null,
    processId: 'process-1',
    process: { id: 'process-1', title: 'Proceso X' },
    clientId: null,
    client: null,
    assigneeUserId: 'user-1',
    assignee: { id: 'user-1', firstName: 'Ana', lastName: 'Ríos' },
    dueAt: null,
    status: { id: 'status-1', code: 'done', label: 'Completada', color: null, isTerminal: true, requiresApproval: true, requiresNote: false },
    pendingApproval: null,
    priority: TaskPriority.NORMAL,
    sortOrder: 0,
    createdBy: 'user-1',
    completedAt: '2026-01-02T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: { isPlanGateError: () => false, promptUpgrade: () => {} } },
      ],
    });

    service = TestBed.inject(TaskApprovalsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listPending hace GET a /task-approvals y extrae approvals', () => {
    let result: TaskApprovalRequestResponse[] | undefined;
    service.listPending().subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', approvals: [approval] });

    expect(result).toEqual([approval]);
  });

  it('listPending en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.listPending().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(apiUrl).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No autorizado');
  });

  it('listPending en error sin mensaje del backend usa el mensaje genérico', () => {
    let error: Error | undefined;
    service.listPending().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(apiUrl).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('decide hace POST a /:id/decide y extrae la tarea resultante', () => {
    let result: TaskResponse | null | undefined;
    service.decide('approval-1', { approve: true, note: 'Aprobado' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/approval-1/decide`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ approve: true, note: 'Aprobado' });
    req.flush({ message: 'ok', task });

    expect(result).toEqual(task);
  });

  it('decide puede resolver con task en null (rechazo que no altera la tarea)', () => {
    let result: TaskResponse | null | undefined;
    service.decide('approval-1', { approve: false }).subscribe((r) => (result = r));

    httpMock.expectOne(`${apiUrl}/approval-1/decide`).flush({ message: 'ok', task: null });

    expect(result).toBeNull();
  });

  it('decide en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.decide('approval-1', { approve: true }).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/approval-1/decide`).flush({ message: 'Ya fue decidida' }, { status: 409, statusText: 'Conflict' });

    expect(error?.message).toBe('Ya fue decidida');
  });
});
