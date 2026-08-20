import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TasksService } from './tasks.service';
import { TaskPriority, TaskResponse, TaskTemplateResponse } from '../models/task.model';
import { TaskActivityResponse } from '../models/task-activity.model';
import { environment } from '../../../environments/environment';

describe('TasksService', () => {
  let service: TasksService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

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
    status: { id: 'status-1', code: 'todo', label: 'Por hacer', color: null, isTerminal: false, requiresApproval: false, requiresNote: false },
    pendingApproval: null,
    priority: TaskPriority.NORMAL,
    sortOrder: 0,
    createdBy: 'user-1',
    completedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const activity: TaskActivityResponse = {
    id: 'activity-1',
    type: 'CREATED',
    actor: { id: 'user-1', firstName: 'Ana', lastName: 'Ríos' },
    fromStatusLabel: null,
    toStatusLabel: null,
    note: null,
    attachments: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const template: TaskTemplateResponse = {
    id: 'template-1',
    name: 'Plantilla litigio civil',
    processStage: null,
    items: [{ id: 'item-1', title: 'Redactar demanda', offsetDays: 0, sortOrder: 0 }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TasksService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll hace GET a /tasks sin params cuando no hay filtros', () => {
    let result: TaskResponse[] | undefined;
    service.getAll().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/tasks`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ message: 'ok', tasks: [task] });

    expect(result).toEqual([task]);
  });

  it('getAll agrega los filtros provistos como params', () => {
    service.getAll({ assignee: 'user-1', processId: 'process-1', statusId: 'status-1', from: '2026-01-01', to: '2026-01-31' }).subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiUrl}/tasks` &&
        r.params.get('assignee') === 'user-1' &&
        r.params.get('processId') === 'process-1' &&
        r.params.get('statusId') === 'status-1' &&
        r.params.get('from') === '2026-01-01' &&
        r.params.get('to') === '2026-01-31',
    );
    req.flush({ message: 'ok', tasks: [] });
  });

  it('getAll en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getAll().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/tasks`).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No autorizado');
  });

  it('getOne hace GET a /tasks/:id y extrae la tarea', () => {
    let result: TaskResponse | undefined;
    service.getOne('task-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/tasks/task-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', task });

    expect(result).toEqual(task);
  });

  it('getOne en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getOne('task-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/tasks/task-1`).flush({ message: 'No encontrada' }, { status: 404, statusText: 'Not Found' });

    expect(error?.message).toBe('No encontrada');
  });

  it('getForProcess hace GET a /legal-processes/:id/tasks', () => {
    let result: TaskResponse[] | undefined;
    service.getForProcess('process-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/legal-processes/process-1/tasks`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', tasks: [task] });

    expect(result).toEqual([task]);
  });

  it('getForProcess en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getForProcess('process-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/legal-processes/process-1/tasks`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al cargar tareas');
  });

  it('create hace POST a /tasks y extrae la tarea creada', () => {
    let result: TaskResponse | undefined;
    service.create({ title: 'Nueva tarea' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/tasks`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Nueva tarea' });
    req.flush({ message: 'ok', task });

    expect(result).toEqual(task);
  });

  it('create en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.create({ title: 'x' }).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/tasks`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al crear tarea');
  });

  it('update hace PATCH a /tasks/:id y extrae la tarea actualizada', () => {
    let result: TaskResponse | undefined;
    service.update('task-1', { title: 'Actualizada' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/tasks/task-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ title: 'Actualizada' });
    req.flush({ message: 'ok', task: { ...task, title: 'Actualizada' } });

    expect(result?.title).toBe('Actualizada');
  });

  it('update en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.update('task-1', {}).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/tasks/task-1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al actualizar tarea');
  });

  it('getActivity hace GET a /tasks/:id/activity y extrae la bitácora', () => {
    let result: TaskActivityResponse[] | undefined;
    service.getActivity('task-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/tasks/task-1/activity`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', activity: [activity] });

    expect(result).toEqual([activity]);
  });

  it('getActivity en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getActivity('task-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/tasks/task-1/activity`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al cargar la bitácora');
  });

  it('delete hace DELETE a /tasks/:id y resuelve void', () => {
    let called = false;
    service.delete('task-1').subscribe(() => (called = true));

    const req = httpMock.expectOne(`${apiUrl}/tasks/task-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok' });

    expect(called).toBe(true);
  });

  it('delete en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.delete('task-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/tasks/task-1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al eliminar tarea');
  });

  it('instantiateTemplate hace POST a /legal-processes/:id/tasks/instantiate-template', () => {
    let result: TaskResponse[] | undefined;
    service.instantiateTemplate('process-1', 'template-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/legal-processes/process-1/tasks/instantiate-template`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ templateId: 'template-1' });
    req.flush({ message: 'ok', tasks: [task] });

    expect(result).toEqual([task]);
  });

  it('instantiateTemplate en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.instantiateTemplate('process-1', 'template-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/legal-processes/process-1/tasks/instantiate-template`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al instanciar la plantilla');
  });

  it('getTemplates hace GET a /task-templates', () => {
    let result: TaskTemplateResponse[] | undefined;
    service.getTemplates().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/task-templates`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', templates: [template] });

    expect(result).toEqual([template]);
  });

  it('getTemplates en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getTemplates().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/task-templates`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al cargar plantillas');
  });

  it('createTemplate hace POST a /task-templates', () => {
    let result: TaskTemplateResponse | undefined;
    service.createTemplate({ name: 'Nueva plantilla', items: [] }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/task-templates`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', template });

    expect(result).toEqual(template);
  });

  it('createTemplate en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.createTemplate({ name: 'x', items: [] }).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/task-templates`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al crear la plantilla');
  });

  it('updateTemplate hace PATCH a /task-templates/:id', () => {
    let result: TaskTemplateResponse | undefined;
    service.updateTemplate('template-1', { name: 'Actualizada' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/task-templates/template-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Actualizada' });
    req.flush({ message: 'ok', template: { ...template, name: 'Actualizada' } });

    expect(result?.name).toBe('Actualizada');
  });

  it('updateTemplate en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.updateTemplate('template-1', {}).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/task-templates/template-1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al actualizar la plantilla');
  });

  it('deleteTemplate hace DELETE a /task-templates/:id y resuelve void', () => {
    let called = false;
    service.deleteTemplate('template-1').subscribe(() => (called = true));

    const req = httpMock.expectOne(`${apiUrl}/task-templates/template-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok' });

    expect(called).toBe(true);
  });

  it('deleteTemplate en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.deleteTemplate('template-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/task-templates/template-1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al eliminar la plantilla');
  });
});
