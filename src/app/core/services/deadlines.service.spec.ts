import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeadlinesService } from './deadlines.service';
import { DeadlineResponse, DeadlineStatus } from '../models/deadline.model';
import { environment } from '../../../environments/environment';

describe('DeadlinesService', () => {
  let service: DeadlinesService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  const deadline: DeadlineResponse = {
    id: 'deadline-1',
    processId: 'process-1',
    process: { id: 'process-1', title: 'Proceso X' },
    title: 'Audiencia inicial',
    type: null,
    dueAt: '2026-09-01T10:00:00.000Z',
    allDay: false,
    notes: null,
    status: DeadlineStatus.PENDING,
    assignees: [],
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(DeadlinesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getForProcess hace GET a /legal-processes/:id/deadlines y extrae la lista', () => {
    let result: DeadlineResponse[] | undefined;
    service.getForProcess('process-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/legal-processes/process-1/deadlines`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', deadlines: [deadline] });

    expect(result).toEqual([deadline]);
  });

  it('getForProcess en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getForProcess('process-1').subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${apiUrl}/legal-processes/process-1/deadlines`)
      .flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No autorizado');
  });

  it('create hace POST y extrae el plazo creado', () => {
    let result: DeadlineResponse | undefined;
    service
      .create('process-1', { title: 'Audiencia inicial', typeId: 'type-1', dueAt: '2026-09-01T10:00:00.000Z' })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/legal-processes/process-1/deadlines`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', deadline });

    expect(result).toEqual(deadline);
  });

  it('create en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.create('process-1', { title: 't', typeId: 'x', dueAt: 'x' }).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/legal-processes/process-1/deadlines`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al crear plazo');
  });

  it('getAll hace GET a /deadlines sin params cuando no hay filtros', () => {
    let result: DeadlineResponse[] | undefined;
    service.getAll().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/deadlines`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ message: 'ok', deadlines: [deadline] });

    expect(result).toEqual([deadline]);
  });

  it('getAll agrega los filtros provistos como params', () => {
    service.getAll({ from: '2026-01-01', to: '2026-01-31', assignee: 'user-1', type: 'type-1', processId: 'process-1' }).subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${apiUrl}/deadlines` &&
        request.params.get('from') === '2026-01-01' &&
        request.params.get('to') === '2026-01-31' &&
        request.params.get('assignee') === 'user-1' &&
        request.params.get('type') === 'type-1' &&
        request.params.get('processId') === 'process-1',
    );
    req.flush({ message: 'ok', deadlines: [] });
  });

  it('getAll en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getAll().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/deadlines`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al cargar plazos');
  });

  it('getOne hace GET a /deadlines/:id y extrae el plazo', () => {
    let result: DeadlineResponse | undefined;
    service.getOne('deadline-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/deadlines/deadline-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', deadline });

    expect(result).toEqual(deadline);
  });

  it('getOne en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getOne('deadline-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/deadlines/deadline-1`).flush({ message: 'No encontrado' }, { status: 404, statusText: 'Not Found' });

    expect(error?.message).toBe('No encontrado');
  });

  it('update hace PATCH y extrae el plazo actualizado', () => {
    let result: DeadlineResponse | undefined;
    service.update('deadline-1', { status: DeadlineStatus.DONE }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/deadlines/deadline-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: DeadlineStatus.DONE });
    req.flush({ message: 'ok', deadline: { ...deadline, status: DeadlineStatus.DONE } });

    expect(result?.status).toBe(DeadlineStatus.DONE);
  });

  it('update en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.update('deadline-1', {}).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/deadlines/deadline-1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al actualizar plazo');
  });

  it('delete hace DELETE y resuelve void', () => {
    let called = false;
    service.delete('deadline-1').subscribe(() => (called = true));

    const req = httpMock.expectOne(`${apiUrl}/deadlines/deadline-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok' });

    expect(called).toBe(true);
  });

  it('delete en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.delete('deadline-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/deadlines/deadline-1`).flush({ message: 'No se puede eliminar' }, { status: 400, statusText: 'Bad Request' });

    expect(error?.message).toBe('No se puede eliminar');
  });
});
