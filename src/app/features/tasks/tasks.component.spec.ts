import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TasksComponent } from './tasks.component';
import { TasksService } from '../../core/services/tasks.service';
import { TaskStatusesService } from '../../core/services/task-statuses.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { TaskApprovalsService } from '../../core/services/task-approvals.service';
import { FilesService } from '../../core/services/files.service';
import { AuthUser } from '../../core/models/auth.model';
import { TaskPriority, TaskResponse } from '../../core/models/task.model';
import { TaskStatusResponse } from '../../core/models/task-status.model';

describe('TasksComponent', () => {
  let tasksServiceMock: {
    getAll: jest.Mock;
    getOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let taskStatusesServiceMock: { getAll: jest.Mock };
  let advisorsServiceMock: { getAdvisors: jest.Mock };
  let legalProcessesServiceMock: { getLegalProcesses: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { success: jest.Mock; error: jest.Mock };
  let authServiceMock: { currentUser: jest.Mock };
  let navigateSpy: jest.SpyInstance;

  const statusTodo: TaskStatusResponse = {
    id: 'st-todo',
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
  const statusInProgress: TaskStatusResponse = {
    ...statusTodo,
    id: 'st-progress',
    code: 'in_progress',
    label: 'En progreso',
    sortOrder: 1,
  };
  const statusRequiresNote: TaskStatusResponse = {
    ...statusTodo,
    id: 'st-note',
    code: 'evidencia',
    label: 'Con evidencia',
    requiresNote: true,
    sortOrder: 2,
  };
  const statusDone: TaskStatusResponse = {
    ...statusTodo,
    id: 'st-done',
    code: 'done',
    label: 'Terminada',
    isTerminal: true,
    sortOrder: 3,
  };

  function buildTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
    return {
      id: 'task-1',
      title: 'Revisar contrato',
      description: null,
      processId: null,
      process: null,
      clientId: null,
      client: null,
      assigneeUserId: null,
      assignee: null,
      dueAt: null,
      status: statusTodo,
      pendingApproval: null,
      priority: TaskPriority.NORMAL,
      sortOrder: 0,
      createdBy: null,
      completedAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      ...overrides,
    };
  }

  function buildDragEvent(
    dataTransferOverrides: Partial<{ getData: jest.Mock; setData: jest.Mock }> = {},
  ): DragEvent {
    return {
      preventDefault: jest.fn(),
      dataTransfer: {
        setData: jest.fn(),
        getData: jest.fn().mockReturnValue(''),
        ...dataTransferOverrides,
      },
    } as unknown as DragEvent;
  }

  function configure(options: {
    queryOpenId?: string | null;
    currentUser?: AuthUser | null;
    tasksOverrides?: Partial<typeof tasksServiceMock>;
  } = {}) {
    tasksServiceMock = {
      getAll: jest.fn().mockReturnValue(of([buildTask()])),
      getOne: jest.fn().mockReturnValue(of(buildTask())),
      create: jest.fn().mockReturnValue(of(buildTask())),
      update: jest.fn().mockReturnValue(of(buildTask())),
      delete: jest.fn().mockReturnValue(of(undefined)),
      ...options.tasksOverrides,
    };
    taskStatusesServiceMock = {
      getAll: jest.fn().mockReturnValue(
        of([statusTodo, statusInProgress, statusRequiresNote, statusDone]),
      ),
    };
    advisorsServiceMock = {
      getAdvisors: jest.fn().mockReturnValue(
        of({ message: 'ok', advisors: [], total: 0, page: 1, limit: 100 }),
      ),
    };
    legalProcessesServiceMock = {
      getLegalProcesses: jest.fn().mockReturnValue(
        of({ message: 'ok', legalProcesses: [], total: 0, page: 1, limit: 100 }),
      ),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastMock = { success: jest.fn(), error: jest.fn() };
    authServiceMock = {
      currentUser: jest.fn().mockReturnValue(
        options.currentUser !== undefined
          ? options.currentUser
          : ({ id: 'user-1', email: 'x@lexar.com', roles: [], permissions: [] } as AuthUser),
      ),
    };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => options.queryOpenId ?? null } },
    };

    return TestBed.configureTestingModule({
      imports: [TasksComponent],
      providers: [
        provideRouter([]),
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TaskStatusesService, useValue: taskStatusesServiceMock },
        { provide: AdvisorsService, useValue: advisorsServiceMock },
        { provide: LegalProcessesService, useValue: legalProcessesServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: TaskApprovalsService, useValue: { listPending: jest.fn().mockReturnValue(of([])) } },
        { provide: FilesService, useValue: { downloadFile: jest.fn().mockReturnValue(of(undefined)) } },
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
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  describe('carga inicial', () => {
    it('carga asesores, procesos, estados y tareas al construirse', async () => {
      await configure();
      const component = createComponent();

      expect(advisorsServiceMock.getAdvisors).toHaveBeenCalledWith(1, 100);
      expect(legalProcessesServiceMock.getLegalProcesses).toHaveBeenCalledWith(1, 100);
      expect(taskStatusesServiceMock.getAll).toHaveBeenCalled();
      expect(tasksServiceMock.getAll).toHaveBeenCalled();
      expect(component.statuses()).toEqual([statusTodo, statusInProgress, statusRequiresNote, statusDone]);
      expect(component.allTasks()).toEqual([buildTask()]);
      expect(component.isLoading()).toBe(false);
    });

    it('sin openId en la URL, no abre ningún detalle ni llama getOne', async () => {
      await configure({ queryOpenId: null });
      const component = createComponent();

      expect(tasksServiceMock.getOne).not.toHaveBeenCalled();
      expect(component.selectedTask()).toBeNull();
    });

    it('con openId en la URL (F18), abre el detalle de esa tarea y limpia el query param', async () => {
      const deepLinked = buildTask({ id: 'task-deep' });
      await configure({
        queryOpenId: 'task-deep',
        tasksOverrides: { getOne: jest.fn().mockReturnValue(of(deepLinked)) },
      });
      const component = createComponent();

      expect(tasksServiceMock.getOne).toHaveBeenCalledWith('task-deep');
      expect(component.selectedTask()).toEqual(deepLinked);
      expect(navigateSpy).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: {}, replaceUrl: true }),
      );
    });
  });

  describe('loadTasks', () => {
    it('en éxito, refresca la tarea seleccionada con la versión fresca del listado', async () => {
      const stale = buildTask({ id: 'task-1', title: 'Título viejo' });
      const fresh = buildTask({ id: 'task-1', title: 'Título nuevo' });
      await configure({ tasksOverrides: { getAll: jest.fn().mockReturnValue(of([stale])) } });
      const component = createComponent();
      component.openDetail(stale);

      tasksServiceMock.getAll.mockReturnValue(of([fresh]));
      component.loadTasks();

      expect(component.selectedTask()).toEqual(fresh);
    });

    it('en error, notifica por toast y termina el loading', async () => {
      await configure({
        tasksOverrides: { getAll: jest.fn().mockReturnValue(throwError(() => new Error('Error al cargar las tareas'))) },
      });
      const component = createComponent();

      expect(toastMock.error).toHaveBeenCalledWith('Error al cargar las tareas');
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('toggleOnlyMine', () => {
    it('sin usuario autenticado, no hace nada', async () => {
      await configure({ currentUser: null });
      const component = createComponent();

      component.toggleOnlyMine();

      expect(component.onlyMine()).toBe(false);
    });

    it('con usuario autenticado, activa el filtro y lo aplica al formulario', async () => {
      await configure();
      const component = createComponent();

      component.toggleOnlyMine();

      expect(component.onlyMine()).toBe(true);
      expect(component.filterForm.getRawValue().assignee).toBe('user-1');
    });
  });

  describe('detalle de tarea', () => {
    it('openDetail/closeDetail controlan la tarea seleccionada', async () => {
      await configure();
      const component = createComponent();
      const task = buildTask();

      component.openDetail(task);
      expect(component.selectedTask()).toEqual(task);

      component.closeDetail();
      expect(component.selectedTask()).toBeNull();
    });

    it('onTaskUpdated actualiza la lista y la tarea seleccionada si coincide', async () => {
      await configure();
      const component = createComponent();
      const original = buildTask({ id: 'task-1', title: 'Original' });
      component.allTasks.set([original]);
      component.openDetail(original);

      const updated = buildTask({ id: 'task-1', title: 'Actualizada' });
      component.onTaskUpdated(updated);

      expect(component.allTasks()).toEqual([updated]);
      expect(component.selectedTask()).toEqual(updated);
    });

    // F28
    it('openEditModal cierra el detalle y abre el modal de edición con la tarea', async () => {
      await configure();
      const component = createComponent();
      const task = buildTask();
      component.openDetail(task);

      component.openEditModal(task);

      expect(component.selectedTask()).toBeNull();
      expect(component.editingTask()).toEqual(task);
      expect(component.editModalOpen()).toBe(true);
    });

    it('closeEditModal cierra el modal de edición', async () => {
      await configure();
      const component = createComponent();
      component.openEditModal(buildTask());

      component.closeEditModal();

      expect(component.editModalOpen()).toBe(false);
    });

    it('onTaskEdited refleja la tarea editada en la lista (mismo camino que onTaskUpdated)', async () => {
      await configure();
      const component = createComponent();
      const original = buildTask({ id: 'task-1', title: 'Original' });
      component.allTasks.set([original]);

      const edited = buildTask({ id: 'task-1', title: 'Editada' });
      component.onTaskEdited(edited);

      expect(component.allTasks()).toEqual([edited]);
    });
  });

  describe('deleteTask', () => {
    it('tarea terminal: no pide confirmación ni elimina', async () => {
      await configure();
      const component = createComponent();

      await component.deleteTask(buildTask({ status: statusDone }));

      expect(confirmDialogMock.confirm).not.toHaveBeenCalled();
      expect(tasksServiceMock.delete).not.toHaveBeenCalled();
    });

    it('confirmación cancelada: no elimina', async () => {
      await configure();
      confirmDialogMock.confirm.mockResolvedValue(false);
      const component = createComponent();

      await component.deleteTask(buildTask());

      expect(tasksServiceMock.delete).not.toHaveBeenCalled();
    });

    it('confirmado y en éxito: notifica, cierra el detalle y recarga', async () => {
      await configure();
      const component = createComponent();
      const task = buildTask();
      component.openDetail(task);

      await component.deleteTask(task);

      expect(tasksServiceMock.delete).toHaveBeenCalledWith('task-1');
      expect(toastMock.success).toHaveBeenCalledWith('Tarea eliminada correctamente.');
      expect(component.selectedTask()).toBeNull();
    });

    it('confirmado y en error: notifica el error', async () => {
      await configure({
        tasksOverrides: { delete: jest.fn().mockReturnValue(throwError(() => new Error('Error al eliminar la tarea'))) },
      });
      const component = createComponent();

      await component.deleteTask(buildTask());

      expect(toastMock.error).toHaveBeenCalledWith('Error al eliminar la tarea');
    });
  });

  describe('estado de bloqueo y presentación de la tarjeta kanban', () => {
    it('isCardLocked es true si hay una aprobación pendiente o el estado es terminal', async () => {
      await configure();
      const component = createComponent();

      expect(component.isCardLocked(buildTask({ status: statusDone }))).toBe(true);
      expect(
        component.isCardLocked(
          buildTask({
            pendingApproval: {
              id: 'p1',
              toStatusLabel: 'Terminada',
              requestedBy: null,
              note: null,
              attachments: [],
              createdAt: '2026-08-01T00:00:00.000Z',
            },
          }),
        ),
      ).toBe(true);
      expect(component.isCardLocked(buildTask())).toBe(false);
    });

    it('kanbanCardClasses y kanbanCardTitle distinguen terminal/pendiente/normal', async () => {
      await configure();
      const component = createComponent();

      const terminal = buildTask({ status: statusDone });
      expect(component.kanbanCardClasses(terminal)).toContain('opacity-75');
      expect(component.kanbanCardTitle(terminal)).toContain('Tarea terminada');

      const pending = buildTask({
        pendingApproval: {
          id: 'p1',
          toStatusLabel: 'Terminada',
          requestedBy: null,
          note: null,
          attachments: [],
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      });
      expect(component.kanbanCardClasses(pending)).toContain('border-warning');
      expect(component.kanbanCardTitle(pending)).toContain('Esperando aprobación');

      const normal = buildTask();
      expect(component.kanbanCardClasses(normal)).toContain('cursor-grab');
      expect(component.kanbanCardTitle(normal)).toBe('');
    });
  });

  describe('drag and drop del tablero', () => {
    it('onDragStart en una tarea bloqueada, previene el arrastre y no fija el payload', async () => {
      await configure();
      const component = createComponent();
      const event = buildDragEvent();

      component.onDragStart(event, buildTask({ status: statusDone }));

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.dataTransfer?.setData).not.toHaveBeenCalled();
    });

    it('onDragStart en una tarea normal, fija el id como payload', async () => {
      await configure();
      const component = createComponent();
      const event = buildDragEvent();

      component.onDragStart(event, buildTask({ id: 'task-9' }));

      expect(event.dataTransfer?.setData).toHaveBeenCalledWith('text/plain', 'task-9');
    });

    it('onDrop sin id de tarea disponible, no hace nada', async () => {
      await configure();
      const component = createComponent();
      const event = buildDragEvent({ getData: jest.fn().mockReturnValue('') });

      component.onDrop(event, statusInProgress);

      expect(tasksServiceMock.update).not.toHaveBeenCalled();
    });

    it('onDrop con una tarea que no existe en el listado, no hace nada', async () => {
      await configure();
      const component = createComponent();
      const event = buildDragEvent({ getData: jest.fn().mockReturnValue('no-existe') });

      component.onDrop(event, statusInProgress);

      expect(tasksServiceMock.update).not.toHaveBeenCalled();
    });

    it('onDrop sobre la misma columna en la que ya está la tarea, no hace nada', async () => {
      const task = buildTask({ status: statusTodo });
      await configure({ tasksOverrides: { getAll: jest.fn().mockReturnValue(of([task])) } });
      const component = createComponent();
      const event = buildDragEvent({ getData: jest.fn().mockReturnValue(task.id) });

      component.onDrop(event, statusTodo);

      expect(tasksServiceMock.update).not.toHaveBeenCalled();
    });

    it('onDrop sobre una tarea bloqueada, no hace nada', async () => {
      const task = buildTask({ status: statusTodo, pendingApproval: {
        id: 'p1', toStatusLabel: 'x', requestedBy: null, note: null, attachments: [], createdAt: '2026-08-01T00:00:00.000Z',
      } });
      await configure({ tasksOverrides: { getAll: jest.fn().mockReturnValue(of([task])) } });
      const component = createComponent();
      const event = buildDragEvent({ getData: jest.fn().mockReturnValue(task.id) });

      component.onDrop(event, statusInProgress);

      expect(tasksServiceMock.update).not.toHaveBeenCalled();
    });

    it('onDrop hacia una columna que requiere anotación, abre el detalle en vez de aplicar el cambio directo', async () => {
      const task = buildTask({ status: statusTodo });
      await configure({ tasksOverrides: { getAll: jest.fn().mockReturnValue(of([task])) } });
      const component = createComponent();
      const event = buildDragEvent({ getData: jest.fn().mockReturnValue(task.id) });

      component.onDrop(event, statusRequiresNote);

      expect(tasksServiceMock.update).not.toHaveBeenCalled();
      expect(component.selectedTask()).toEqual(task);
    });

    it('onDrop hacia una columna normal, aplica el cambio de estado vía TasksService.update', async () => {
      const task = buildTask({ status: statusTodo });
      const updated = buildTask({ status: statusInProgress });
      await configure({
        tasksOverrides: {
          getAll: jest.fn().mockReturnValue(of([task])),
          update: jest.fn().mockReturnValue(of(updated)),
        },
      });
      const component = createComponent();
      const event = buildDragEvent({ getData: jest.fn().mockReturnValue(task.id) });

      component.onDrop(event, statusInProgress);

      expect(tasksServiceMock.update).toHaveBeenCalledWith('task-1', { statusId: 'st-progress' });
      expect(component.allTasks()).toEqual([updated]);
      expect(toastMock.success).toHaveBeenCalledWith('Tarea actualizada correctamente.');
    });

    it('onDrop cuyo resultado queda pendiente de aprobación, muestra el mensaje correspondiente', async () => {
      const task = buildTask({ status: statusTodo });
      const updated = buildTask({
        status: statusTodo,
        pendingApproval: {
          id: 'p1',
          toStatusLabel: 'En progreso',
          requestedBy: null,
          note: null,
          attachments: [],
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      });
      await configure({
        tasksOverrides: {
          getAll: jest.fn().mockReturnValue(of([task])),
          update: jest.fn().mockReturnValue(of(updated)),
        },
      });
      const component = createComponent();
      const event = buildDragEvent({ getData: jest.fn().mockReturnValue(task.id) });

      component.onDrop(event, statusInProgress);

      expect(toastMock.success).toHaveBeenCalledWith(
        expect.stringContaining('Cambio enviado a aprobación'),
      );
    });

    it('onDrop cuando el backend rechaza el cambio, notifica el error', async () => {
      const task = buildTask({ status: statusTodo });
      await configure({
        tasksOverrides: {
          getAll: jest.fn().mockReturnValue(of([task])),
          update: jest.fn().mockReturnValue(throwError(() => new Error('Error al actualizar la tarea'))),
        },
      });
      const component = createComponent();
      const event = buildDragEvent({ getData: jest.fn().mockReturnValue(task.id) });

      component.onDrop(event, statusInProgress);

      expect(toastMock.error).toHaveBeenCalledWith('Error al actualizar la tarea');
    });
  });

  describe('modal de creación', () => {
    it('openCreateModal resetea el formulario y abre el modal', async () => {
      await configure();
      const component = createComponent();

      component.createForm.patchValue({ title: 'sucio' });
      component.createError.set('error previo');
      component.openCreateModal();

      expect(component.createModalOpen()).toBe(true);
      expect(component.createForm.getRawValue().title).toBe('');
      expect(component.createError()).toBeNull();
    });

    it('closeCreateModal cierra el modal y limpia el error', async () => {
      await configure();
      const component = createComponent();
      component.openCreateModal();
      component.createError.set('algo');

      component.closeCreateModal();

      expect(component.createModalOpen()).toBe(false);
      expect(component.createError()).toBeNull();
    });

    it('submitCreate no hace nada si ya hay una creación en curso', async () => {
      await configure();
      const component = createComponent();
      component.isCreating.set(true);
      component.createForm.setValue({
        title: 'Nueva tarea',
        description: '',
        processId: '',
        assigneeUserId: '',
        dueAt: '',
        priority: TaskPriority.NORMAL,
      });

      component.submitCreate();

      expect(tasksServiceMock.create).not.toHaveBeenCalled();
    });

    it('submitCreate con formulario inválido, lo marca completo como tocado y no llama al servicio', async () => {
      await configure();
      const component = createComponent();
      component.createForm.setValue({
        title: '',
        description: '',
        processId: '',
        assigneeUserId: '',
        dueAt: '',
        priority: TaskPriority.NORMAL,
      });

      component.submitCreate();

      expect(component.createForm.invalid).toBe(true);
      expect(tasksServiceMock.create).not.toHaveBeenCalled();
    });

    it('submitCreate válido, mapea campos vacíos a undefined y la fecha a ISO', async () => {
      await configure();
      const component = createComponent();
      component.createForm.setValue({
        title: 'Nueva tarea',
        description: '',
        processId: '',
        assigneeUserId: '',
        dueAt: '2026-09-01T10:00',
        priority: TaskPriority.HIGH,
      });

      component.submitCreate();

      expect(tasksServiceMock.create).toHaveBeenCalledWith({
        title: 'Nueva tarea',
        description: undefined,
        processId: undefined,
        assigneeUserId: undefined,
        dueAt: new Date('2026-09-01T10:00').toISOString(),
        priority: TaskPriority.HIGH,
      });
      expect(toastMock.success).toHaveBeenCalledWith('Tarea creada correctamente.');
      expect(component.createModalOpen()).toBe(false);
    });

    it('submitCreate en error, expone el mensaje y libera isCreating', async () => {
      await configure({
        tasksOverrides: { create: jest.fn().mockReturnValue(throwError(() => new Error('Error al crear tarea'))) },
      });
      const component = createComponent();
      component.createForm.setValue({
        title: 'Nueva tarea',
        description: '',
        processId: '',
        assigneeUserId: '',
        dueAt: '',
        priority: TaskPriority.NORMAL,
      });

      component.submitCreate();

      expect(component.createError()).toBe('Error al crear tarea');
      expect(toastMock.error).toHaveBeenCalledWith('Error al crear tarea');
      expect(component.isCreating()).toBe(false);
    });
  });

  describe('tasksByStatus', () => {
    it('filtra las tareas por el id del estado', async () => {
      const t1 = buildTask({ id: 't1', status: statusTodo });
      const t2 = buildTask({ id: 't2', status: statusInProgress });
      await configure({ tasksOverrides: { getAll: jest.fn().mockReturnValue(of([t1, t2])) } });
      const component = createComponent();

      expect(component.tasksByStatus(statusTodo.id)()).toEqual([t1]);
      expect(component.tasksByStatus(statusInProgress.id)()).toEqual([t2]);
    });
  });

  describe('taskGroups', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('agrupa por urgencia temporal, excluye terminales y ordena por fecha dentro de cada grupo', async () => {
      const overdue = buildTask({ id: 'overdue', dueAt: '2026-08-19T08:00:00.000Z' });
      const todayLater = buildTask({ id: 'today-later', dueAt: '2026-08-20T20:00:00.000Z' });
      const todayEarlier = buildTask({ id: 'today-earlier', dueAt: '2026-08-20T14:00:00.000Z' });
      const thisWeek = buildTask({ id: 'week', dueAt: '2026-08-24T09:00:00.000Z' });
      const later = buildTask({ id: 'later', dueAt: '2026-09-15T09:00:00.000Z' });
      const noDate = buildTask({ id: 'none', dueAt: null });
      const terminal = buildTask({ id: 'terminal', status: statusDone, dueAt: '2026-08-19T08:00:00.000Z' });

      await configure({
        tasksOverrides: {
          getAll: jest.fn().mockReturnValue(
            of([overdue, todayLater, todayEarlier, thisWeek, later, noDate, terminal]),
          ),
        },
      });
      const component = createComponent();

      const groups = component.taskGroups();
      expect(groups.map((g) => g.key)).toEqual(['overdue', 'today', 'week', 'later', 'none']);
      expect(groups[0].tasks).toEqual([overdue]);
      expect(groups[1].tasks).toEqual([todayEarlier, todayLater]);
      expect(groups[2].tasks).toEqual([thisWeek]);
      expect(groups[3].tasks).toEqual([later]);
      expect(groups[4].tasks).toEqual([noDate]);
      const allGroupedIds = groups.flatMap((g) => g.tasks.map((t) => t.id));
      expect(allGroupedIds).not.toContain('terminal');
    });
  });
});
