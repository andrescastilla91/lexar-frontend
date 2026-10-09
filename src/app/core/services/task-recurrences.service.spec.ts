import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskRecurrencesService } from './task-recurrences.service';
import {
  RecurrenceFrequency,
  TaskRecurrenceResponse,
  TaskRecurrenceStatus,
} from '../models/task-recurrence.model';
import { TaskPriority } from '../models/task.model';
import { environment } from '../../../environments/environment';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('TaskRecurrencesService', () => {
  let service: TaskRecurrencesService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  const recurrence: TaskRecurrenceResponse = {
    id: 'rec-1',
    title: 'Revisión mensual',
    description: null,
    processId: null,
    process: null,
    clientId: null,
    client: null,
    assigneeUserId: null,
    assignee: null,
    priority: TaskPriority.NORMAL,
    frequency: RecurrenceFrequency.MONTHLY,
    startDate: '2026-11-05',
    dueTime: '17:00',
    endDate: null,
    maxOccurrences: null,
    generatedCount: 1,
    status: TaskRecurrenceStatus.ACTIVE,
    nextOccurrenceDate: '2026-12-05',
    lastTaskId: 'task-1',
    stoppedAt: null,
    createdBy: 'user-1',
    createdAt: '2026-10-06T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: { isPlanGateError: () => false, promptUpgrade: () => {} } },
      ],
    });
    service = TestBed.inject(TaskRecurrencesService);
    httpMock = TestBed.inject(HttpTestingController);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
  });

  it('getAll envía solo los filtros presentes y desenvuelve la lista', () => {
    let result: TaskRecurrenceResponse[] | undefined;
    service
      .getAll({ status: TaskRecurrenceStatus.ACTIVE, clientId: 'client-1' })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne((r) => r.url === `${apiUrl}/task-recurrences`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    expect(req.request.params.get('clientId')).toBe('client-1');
    expect(req.request.params.has('processId')).toBe(false);
    req.flush({ message: 'ok', recurrences: [recurrence] });

    expect(result).toEqual([recurrence]);
  });

  it('getOccurrences pide las ocurrencias de la serie', () => {
    let count = 0;
    service.getOccurrences('rec-1').subscribe((tasks) => (count = tasks.length));

    const req = httpMock.expectOne(`${apiUrl}/task-recurrences/rec-1/occurrences`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', tasks: [{ id: 't1' }, { id: 't2' }] });

    expect(count).toBe(2);
  });

  it('create hace POST con la petición y devuelve la serie', () => {
    let result: TaskRecurrenceResponse | undefined;
    const request = {
      title: 'Revisión mensual',
      frequency: RecurrenceFrequency.MONTHLY,
      startDate: '2026-11-05',
    };
    service.create(request).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/task-recurrences`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ message: 'ok', recurrence });

    expect(result).toEqual(recurrence);
  });

  it('update hace PATCH sobre la serie', () => {
    service.update('rec-1', { title: 'Nuevo', endDate: null }).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/task-recurrences/rec-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'Nuevo', endDate: null });
    req.flush({ message: 'ok', recurrence });
  });

  it('stop hace POST a /stop', () => {
    let result: TaskRecurrenceResponse | undefined;
    service.stop('rec-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/task-recurrences/rec-1/stop`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', recurrence: { ...recurrence, status: 'STOPPED' } });

    expect(result?.status).toBe(TaskRecurrenceStatus.STOPPED);
  });

  it('resume hace POST a /resume', () => {
    let result: TaskRecurrenceResponse | undefined;
    service.resume('rec-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/task-recurrences/rec-1/resume`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', recurrence: { ...recurrence, status: 'ACTIVE' } });

    expect(result?.status).toBe(TaskRecurrenceStatus.ACTIVE);
  });

  it('finalize hace POST a /finalize', () => {
    let result: TaskRecurrenceResponse | undefined;
    service.finalize('rec-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/task-recurrences/rec-1/finalize`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', recurrence: { ...recurrence, status: 'COMPLETED' } });

    expect(result?.status).toBe(TaskRecurrenceStatus.COMPLETED);
  });

  it('los errores llegan como Error con el mensaje del backend', () => {
    let message = '';
    service.create({ title: 'x', frequency: RecurrenceFrequency.DAILY, startDate: '2020-01-01' }).subscribe({
      error: (e: Error) => (message = e.message),
    });

    httpMock
      .expectOne(`${apiUrl}/task-recurrences`)
      .flush({ message: 'La fecha de inicio no puede ser anterior a hoy' }, { status: 400, statusText: 'Bad Request' });

    expect(message).toBe('La fecha de inicio no puede ser anterior a hoy');
  });
});
