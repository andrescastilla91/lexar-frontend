import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TaskStatusControlComponent } from './task-status-control.component';
import { TasksService } from '../../../core/services/tasks.service';
import { FilesService } from '../../../core/services/files.service';
import { ToastService } from '../../../core/services/toast.service';
import { TaskPriority, TaskResponse } from '../../../core/models/task.model';
import { TaskStatusResponse } from '../../../core/models/task-status.model';
import { TaskActivityResponse } from '../../../core/models/task-activity.model';
import { FileModel } from '../../../core/models/file.model';

describe('TaskStatusControlComponent', () => {
  let tasksServiceMock: { update: jest.Mock; getActivity: jest.Mock };
  let filesServiceMock: { uploadFile: jest.Mock; downloadFile: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const statuses: TaskStatusResponse[] = [
    {
      id: 's1',
      code: 'pendiente',
      label: 'Pendiente',
      color: 'info',
      isTerminal: false,
      requiresApproval: false,
      requiresNote: false,
      sortOrder: 0,
      isSystem: true,
      isActive: true,
      approvers: [],
    },
    {
      id: 's2',
      code: 'en_revision',
      label: 'En revisión',
      color: 'warning',
      isTerminal: false,
      requiresApproval: false,
      requiresNote: true,
      sortOrder: 1,
      isSystem: false,
      isActive: true,
      approvers: [],
    },
    {
      id: 's3',
      code: 'aprobado',
      label: 'Aprobado',
      color: 'success',
      isTerminal: true,
      requiresApproval: true,
      requiresNote: false,
      sortOrder: 2,
      isSystem: false,
      isActive: true,
      approvers: [],
    },
  ];

  function buildTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
    return {
      id: 'task1',
      title: 'Redactar demanda',
      description: null,
      processId: null,
      process: null,
      clientId: null,
      client: null,
      assigneeUserId: null,
      assignee: null,
      dueAt: null,
      status: statuses[0],
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

  function configure(): void {
    tasksServiceMock = { update: jest.fn(), getActivity: jest.fn() };
    filesServiceMock = { uploadFile: jest.fn(), downloadFile: jest.fn().mockReturnValue(of(undefined)) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TaskStatusControlComponent],
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: FilesService, useValue: filesServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });
  }

  function createComponent(task: TaskResponse = buildTask()) {
    const fixture = TestBed.createComponent(TaskStatusControlComponent);
    fixture.componentRef.setInput('task', task);
    fixture.componentRef.setInput('statuses', statuses);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => configure());

  it('si el estado es terminal, no muestra el selector y avisa que ya no admite cambios', () => {
    const { fixture } = createComponent(buildTask({ status: statuses[2] }));

    expect(fixture.nativeElement.textContent).toContain('Tarea terminada');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });

  it('si hay una aprobación pendiente, muestra el bloque de espera con quien la solicitó', () => {
    const { fixture } = createComponent(
      buildTask({
        pendingApproval: {
          id: 'pa1',
          toStatusLabel: 'Aprobado',
          requestedBy: { id: 'u1', firstName: 'Ana', lastName: 'Gómez' },
          note: 'Cliente firmó recibido',
          attachments: [],
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      }),
    );

    expect(fixture.nativeElement.textContent).toContain('A la espera de aprobación');
    expect(fixture.nativeElement.textContent).toContain('Ana Gómez');
    expect(fixture.nativeElement.textContent).toContain('Cliente firmó recibido');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });

  it('si la aprobación pendiente no tiene requestedBy, muestra "un usuario"', () => {
    const { fixture } = createComponent(
      buildTask({
        pendingApproval: {
          id: 'pa1',
          toStatusLabel: 'Aprobado',
          requestedBy: null,
          note: null,
          attachments: [],
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      }),
    );

    expect(fixture.nativeElement.textContent).toContain('un usuario');
  });

  it('sin estado terminal ni aprobación pendiente, muestra el selector con todos los estados', () => {
    const { fixture } = createComponent();

    const options = fixture.nativeElement.querySelectorAll('select option');
    expect(options.length).toBe(statuses.length);
  });

  it('onStatusSelect no hace nada si se elige el mismo estado actual', () => {
    const { component } = createComponent();

    component.onStatusSelect('s1');

    expect(component.pendingStatus()).toBeNull();
    expect(tasksServiceMock.update).not.toHaveBeenCalled();
  });

  it('onStatusSelect no hace nada si el estado destino no existe en la lista', () => {
    const { component } = createComponent();

    component.onStatusSelect('inexistente');

    expect(component.pendingStatus()).toBeNull();
  });

  it('onStatusSelect abre el panel de anotación si el destino requiere nota o aprobación', () => {
    const { component } = createComponent();

    component.onStatusSelect('s2');

    expect(component.pendingStatus()?.id).toBe('s2');
    expect(component.pendingNote()).toBe('');
    expect(component.pendingFiles()).toEqual([]);
    expect(tasksServiceMock.update).not.toHaveBeenCalled();
  });

  it('onStatusSelect envía el cambio directo si el destino no requiere nota ni aprobación', async () => {
    tasksServiceMock.update.mockReturnValue(of(buildTask({ status: statuses[1] })));
    const { component } = createComponent(buildTask({ status: statuses[1] }));
    // s1 no requiere nada, y el estado actual de esta task es s2: forzamos target s1
    component.onStatusSelect('s1');
    // submit() encadena siempre por Promise (incluso sin archivos), así que
    // el update real solo ocurre tras vaciar la cola de microtasks.
    await Promise.resolve();
    await Promise.resolve();

    expect(tasksServiceMock.update).toHaveBeenCalledWith('task1', {
      statusId: 's1',
      note: undefined,
      attachmentFileIds: undefined,
    });
  });

  it('onFilesSelected agrega archivos y limpia el input; removeFile los quita por índice', () => {
    const { component } = createComponent();
    const file1 = new File(['a'], 'a.pdf');
    const file2 = new File(['b'], 'b.pdf');
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file1, file2] });

    component.onFilesSelected({ target: input } as unknown as Event);

    expect(component.pendingFiles()).toEqual([file1, file2]);
    expect(input.value).toBe('');

    component.removeFile(0);
    expect(component.pendingFiles()).toEqual([file2]);
  });

  it('confirmChange no hace nada si no hay un estado pendiente', () => {
    const { component } = createComponent();

    component.confirmChange();

    expect(tasksServiceMock.update).not.toHaveBeenCalled();
  });

  it('confirmChange no hace nada si el destino requiere nota y está vacía', () => {
    const { component } = createComponent();
    component.onStatusSelect('s2');

    component.confirmChange();

    expect(tasksServiceMock.update).not.toHaveBeenCalled();
  });

  it('confirmChange envía el cambio con la nota y archivos pendientes', async () => {
    tasksServiceMock.update.mockReturnValue(of(buildTask({ status: statuses[1] })));
    const { component } = createComponent();
    component.onStatusSelect('s2');
    component.pendingNote.set('Cliente visitado');
    const file = new File(['x'], 'evidencia.pdf');
    component.pendingFiles.set([file]);
    filesServiceMock.uploadFile.mockReturnValue(
      of({ id: 'file-1' } as FileModel),
    );

    component.confirmChange();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(filesServiceMock.uploadFile).toHaveBeenCalledWith(file, 'task', 'task1');
    expect(tasksServiceMock.update).toHaveBeenCalledWith('task1', {
      statusId: 's2',
      note: 'Cliente visitado',
      attachmentFileIds: ['file-1'],
    });
  });

  it('cancelChange limpia el estado pendiente, la nota y los archivos', () => {
    const { component } = createComponent();
    component.onStatusSelect('s2');
    component.pendingNote.set('algo');
    component.pendingFiles.set([new File(['x'], 'a.pdf')]);

    component.cancelChange();

    expect(component.pendingStatus()).toBeNull();
    expect(component.pendingNote()).toBe('');
    expect(component.pendingFiles()).toEqual([]);
  });

  it('en éxito sin pendingApproval en la respuesta, muestra el toast estándar y emite updated', async () => {
    const updatedTask = buildTask({ status: statuses[0] });
    tasksServiceMock.update.mockReturnValue(of(updatedTask));
    // Task actual en s2 (En revisión) para poder moverla a s1 (Pendiente),
    // que no exige nota ni aprobación y dispara el envío automático.
    const { component } = createComponent(buildTask({ status: statuses[1] }));
    const updatedSpy = jest.fn();
    component.updated.subscribe(updatedSpy);

    component.onStatusSelect('s1');
    await Promise.resolve();
    await Promise.resolve();

    expect(toastServiceMock.success).toHaveBeenCalledWith('Tarea actualizada correctamente.');
    expect(updatedSpy).toHaveBeenCalledWith(updatedTask);
    expect(component.isSubmitting()).toBe(false);
  });

  it('en éxito con pendingApproval en la respuesta, muestra el toast de "enviado a aprobación"', async () => {
    const updatedTask = buildTask({
      pendingApproval: {
        id: 'pa1',
        toStatusLabel: 'Aprobado',
        requestedBy: null,
        note: null,
        attachments: [],
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    });
    tasksServiceMock.update.mockReturnValue(of(updatedTask));
    const { component } = createComponent(buildTask({ status: statuses[1] }));

    component.onStatusSelect('s1');
    await Promise.resolve();
    await Promise.resolve();

    expect(toastServiceMock.success).toHaveBeenCalledWith(
      expect.stringContaining('Cambio enviado a aprobación'),
    );
  });

  it('en error del backend, muestra un toast y libera isSubmitting', async () => {
    tasksServiceMock.update.mockReturnValue(throwError(() => new Error('Error al actualizar la tarea')));
    const { component } = createComponent(buildTask({ status: statuses[1] }));

    component.onStatusSelect('s1');
    await Promise.resolve();
    await Promise.resolve();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al actualizar la tarea');
    expect(component.isSubmitting()).toBe(false);
  });

  it('si falla la subida de un adjunto, muestra un toast y no llama a tasksService.update', async () => {
    const { component } = createComponent();
    component.onStatusSelect('s2');
    component.pendingNote.set('nota');
    component.pendingFiles.set([new File(['x'], 'a.pdf')]);
    filesServiceMock.uploadFile.mockReturnValue(throwError(() => new Error('Error al subir los adjuntos')));

    component.confirmChange();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(tasksServiceMock.update).not.toHaveBeenCalled();
    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al subir los adjuntos');
    expect(component.isSubmitting()).toBe(false);
  });

  it('toggleActivity abre la bitácora y la carga la primera vez', () => {
    const activity: TaskActivityResponse[] = [
      {
        id: 'a1',
        type: 'CREATED',
        actor: { id: 'u1', firstName: 'Ana', lastName: 'Gómez' },
        fromStatusLabel: null,
        toStatusLabel: null,
        note: null,
        attachments: [],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    tasksServiceMock.getActivity.mockReturnValue(of(activity));
    const { component } = createComponent();

    component.toggleActivity();

    expect(component.expandedActivity()).toBe(true);
    expect(tasksServiceMock.getActivity).toHaveBeenCalledWith('task1');
    expect(component.activity()).toEqual(activity);
    expect(component.isLoadingActivity()).toBe(false);
  });

  it('toggleActivity no recarga si ya había actividad cargada; toggle de nuevo la oculta', () => {
    tasksServiceMock.getActivity.mockReturnValue(of([]));
    const { component } = createComponent();

    component.toggleActivity();
    tasksServiceMock.getActivity.mockClear();
    component.toggleActivity();
    expect(component.expandedActivity()).toBe(false);

    component.toggleActivity();
    expect(tasksServiceMock.getActivity).not.toHaveBeenCalled();
  });

  it('si falla la carga de la bitácora, apaga isLoadingActivity sin mostrar toast', () => {
    tasksServiceMock.getActivity.mockReturnValue(throwError(() => new Error('fail')));
    const { component } = createComponent();

    component.toggleActivity();

    expect(component.isLoadingActivity()).toBe(false);
    expect(toastServiceMock.error).not.toHaveBeenCalled();
  });

  it('downloadAttachment descarga el archivo por id', () => {
    const { component } = createComponent();

    component.downloadAttachment('file-1');

    expect(filesServiceMock.downloadFile).toHaveBeenCalledWith('file-1');
  });

  it('describeActivity traduce los tipos de actividad conocidos', () => {
    const { component } = createComponent();

    expect(component.describeActivity({ type: 'CREATED' } as TaskActivityResponse)).toBe('Tarea creada');
    expect(
      component.describeActivity({
        type: 'STATUS_CHANGED',
        fromStatusLabel: 'Pendiente',
        toStatusLabel: 'Aprobado',
      } as TaskActivityResponse),
    ).toBe('Estado: Pendiente → Aprobado');
    expect(component.describeActivity({ type: 'DELETED' } as TaskActivityResponse)).toBe('Tarea eliminada');
    expect(component.describeActivity({ type: 'UNKNOWN_TYPE' } as unknown as TaskActivityResponse)).toBe(
      'UNKNOWN_TYPE',
    );
  });
});
