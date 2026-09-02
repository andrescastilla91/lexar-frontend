import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskStatusesService } from './task-statuses.service';
import { TaskApprovalCandidate, TaskStatusResponse } from '../models/task-status.model';
import { environment } from '../../../environments/environment';

import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('TaskStatusesService', () => {
  let service: TaskStatusesService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/task-statuses`;

  const status: TaskStatusResponse = {
    id: 'status-1',
    code: 'todo',
    label: 'Por hacer',
    color: '#999999',
    isTerminal: false,
    requiresApproval: false,
    requiresNote: false,
    sortOrder: 1,
    isSystem: true,
    isActive: true,
    approvers: [],
  };

  const candidate: TaskApprovalCandidate = {
    id: 'user-1',
    firstName: 'Ana',
    lastName: 'Ríos',
    email: 'ana@lexar.com',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: { isPlanGateError: () => false, promptUpgrade: () => {} } },
      ],
    });

    service = TestBed.inject(TaskStatusesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll hace GET a /task-statuses y extrae statuses', () => {
    let result: TaskStatusResponse[] | undefined;
    service.getAll().subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', statuses: [status] });

    expect(result).toEqual([status]);
  });

  it('getAll en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getAll().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(apiUrl).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No autorizado');
  });

  it('create hace POST y extrae el estado creado', () => {
    let result: TaskStatusResponse | undefined;
    service.create({ code: 'todo', label: 'Por hacer' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'todo', label: 'Por hacer' });
    req.flush({ message: 'ok', status });

    expect(result).toEqual(status);
  });

  it('create en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.create({ code: 'x', label: 'X' }).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(apiUrl).flush({ message: 'Código duplicado' }, { status: 409, statusText: 'Conflict' });

    expect(error?.message).toBe('Código duplicado');
  });

  it('update hace PATCH a /:id y extrae el estado actualizado', () => {
    let result: TaskStatusResponse | undefined;
    service.update('status-1', { label: 'Actualizado' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/status-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ label: 'Actualizado' });
    req.flush({ message: 'ok', status: { ...status, label: 'Actualizado' } });

    expect(result?.label).toBe('Actualizado');
  });

  it('update en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.update('status-1', {}).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/status-1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('delete hace DELETE a /:id y resuelve void', () => {
    let called = false;
    service.delete('status-1').subscribe(() => (called = true));

    const req = httpMock.expectOne(`${apiUrl}/status-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok' });

    expect(called).toBe(true);
  });

  it('delete en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.delete('status-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/status-1`).flush({ message: 'Estado en uso' }, { status: 400, statusText: 'Bad Request' });

    expect(error?.message).toBe('Estado en uso');
  });

  it('getApprovalCandidates hace GET a /approval-candidates y extrae users', () => {
    let result: TaskApprovalCandidate[] | undefined;
    service.getApprovalCandidates().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/approval-candidates`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', users: [candidate] });

    expect(result).toEqual([candidate]);
  });

  it('getApprovalCandidates en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getApprovalCandidates().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/approval-candidates`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });
});
