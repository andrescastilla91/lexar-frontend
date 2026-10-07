import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TaskRecurrencesComponent, formatDateOnly } from './task-recurrences.component';
import { TaskRecurrencesService } from '../../core/services/task-recurrences.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionsService } from '../../core/services/permissions.service';
import {
  RecurrenceFrequency,
  TaskRecurrenceResponse,
  TaskRecurrenceStatus,
} from '../../core/models/task-recurrence.model';
import { TaskPriority, TaskResponse } from '../../core/models/task.model';

describe('TaskRecurrencesComponent', () => {
  let recurrencesServiceMock: {
    getAll: jest.Mock;
    getOccurrences: jest.Mock;
    stop: jest.Mock;
    resume: jest.Mock;
    finalize: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { success: jest.Mock; error: jest.Mock };
  let permissionsMock: { hasPermission: jest.Mock };

  const recurrence = (overrides: Partial<TaskRecurrenceResponse> = {}): TaskRecurrenceResponse => ({
    id: 'rec-1',
    title: 'Revisión mensual',
    description: null,
    processId: null,
    process: null,
    clientId: 'client-1',
    client: { id: 'client-1', name: 'Ana Ríos' },
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
    ...overrides,
  });

  const occurrenceTask = {
    id: 'task-1',
    occurrenceNumber: 1,
    dueAt: '2026-11-05T22:00:00.000Z',
    status: { label: 'Por hacer' },
  } as unknown as TaskResponse;

  function create(options: { canEdit?: boolean; list?: TaskRecurrenceResponse[] } = {}) {
    recurrencesServiceMock = {
      getAll: jest.fn().mockReturnValue(of(options.list ?? [recurrence()])),
      getOccurrences: jest.fn().mockReturnValue(of([occurrenceTask])),
      stop: jest.fn().mockReturnValue(of(recurrence({ status: TaskRecurrenceStatus.STOPPED }))),
      resume: jest.fn().mockReturnValue(of(recurrence())),
      finalize: jest.fn().mockReturnValue(of(recurrence({ status: TaskRecurrenceStatus.COMPLETED }))),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastMock = { success: jest.fn(), error: jest.fn() };
    permissionsMock = { hasPermission: jest.fn().mockReturnValue(options.canEdit ?? true) };

    TestBed.configureTestingModule({
      imports: [TaskRecurrencesComponent],
      providers: [
        provideRouter([]),
        { provide: TaskRecurrencesService, useValue: recurrencesServiceMock },
        { provide: AdvisorsService, useValue: { getAdvisors: jest.fn().mockReturnValue(of({ advisors: [] })) } },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
        { provide: PermissionsService, useValue: permissionsMock },
      ],
    });
    const fixture = TestBed.createComponent(TaskRecurrencesComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('carga las series activas al abrir', () => {
    const fixture = create();

    expect(recurrencesServiceMock.getAll).toHaveBeenCalledWith({
      status: TaskRecurrenceStatus.ACTIVE,
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Revisión mensual');
    expect(text).toContain('Mensual');
    expect(text).toContain('Próxima: 05/12/2026 a las 17:00');
    expect(text).toContain('1 ocurrencia generada · Sin fecha de fin');
  });

  it('cambiar el filtro recarga; "Todas" no envía estado', () => {
    const fixture = create();

    fixture.componentInstance.statusFilter.setValue(TaskRecurrenceStatus.STOPPED);
    expect(recurrencesServiceMock.getAll).toHaveBeenLastCalledWith({
      status: TaskRecurrenceStatus.STOPPED,
    });

    fixture.componentInstance.statusFilter.setValue('ALL');
    expect(recurrencesServiceMock.getAll).toHaveBeenLastCalledWith(undefined);
  });

  it('muestra el estado vacío', () => {
    const fixture = create({ list: [] });

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No hay tareas recurrentes en este estado.',
    );
  });

  it('muestra el error de carga', () => {
    const fixture = create();
    recurrencesServiceMock.getAll.mockReturnValue(throwError(() => new Error('falló')));

    fixture.componentInstance.load();
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe('falló');
    expect(fixture.componentInstance.isLoading()).toBe(false);
  });

  it('el progreso refleja el fin por número o por fecha', () => {
    const component = create().componentInstance;

    expect(component.progressText(recurrence({ generatedCount: 2, maxOccurrences: 6 }))).toBe(
      '2 ocurrencias generadas de 6',
    );
    expect(component.progressText(recurrence({ endDate: '2027-01-31' }))).toBe(
      '1 ocurrencia generada · Termina el 31/01/2027',
    );
  });

  it('ver ocurrencias las carga y volver a pulsar las oculta', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.toggleOccurrences(recurrence());
    fixture.detectChanges();

    expect(recurrencesServiceMock.getOccurrences).toHaveBeenCalledWith('rec-1');
    expect(component.occurrences()).toEqual([occurrenceTask]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ocurrencia 1');

    component.toggleOccurrences(recurrence());
    expect(component.expandedId()).toBeNull();
  });

  it('detener pide confirmación, llama al servicio, avisa y recarga', async () => {
    const component = create().componentInstance;

    await component.stop(recurrence());

    expect(confirmDialogMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Detener tarea recurrente', confirmLabel: 'Detener' }),
    );
    expect(recurrencesServiceMock.stop).toHaveBeenCalledWith('rec-1');
    expect(toastMock.success).toHaveBeenCalled();
    expect(recurrencesServiceMock.getAll).toHaveBeenCalledTimes(2);
  });

  it('si se cancela la confirmación no detiene nada', async () => {
    const component = create().componentInstance;
    confirmDialogMock.confirm.mockResolvedValue(false);

    await component.stop(recurrence());

    expect(recurrencesServiceMock.stop).not.toHaveBeenCalled();
  });

  it('un error al detener se avisa con un toast', async () => {
    const component = create().componentInstance;
    recurrencesServiceMock.stop.mockReturnValue(throwError(() => new Error('no se pudo')));

    await component.stop(recurrence());

    expect(toastMock.error).toHaveBeenCalledWith('no se pudo');
    expect(component.isBusy()).toBe(false);
  });

  const buttonLabels = (fixture: ReturnType<typeof create>) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map((b) =>
      b.textContent?.trim(),
    );

  it('sin permiso tasks.update no ofrece acciones de ciclo de vida', () => {
    const labels = buttonLabels(create({ canEdit: false }));

    expect(labels).toContain('Ver ocurrencias');
    for (const action of ['Editar', 'Detener', 'Reanudar', 'Finalizar']) {
      expect(labels).not.toContain(action);
    }
  });

  it('una serie activa ofrece Editar, Detener y Finalizar (no Reanudar)', () => {
    const labels = buttonLabels(create());

    expect(labels).toEqual(expect.arrayContaining(['Editar', 'Detener', 'Finalizar']));
    expect(labels).not.toContain('Reanudar');
  });

  it('una serie detenida ofrece Reanudar y Finalizar (no Editar ni Detener)', () => {
    const labels = buttonLabels(
      create({
        list: [recurrence({ status: TaskRecurrenceStatus.STOPPED, nextOccurrenceDate: null })],
      }),
    );

    expect(labels).toEqual(expect.arrayContaining(['Reanudar', 'Finalizar']));
    expect(labels).not.toContain('Editar');
    expect(labels).not.toContain('Detener');
  });

  it('una serie finalizada no ofrece ninguna acción de ciclo de vida', () => {
    const labels = buttonLabels(
      create({
        list: [recurrence({ status: TaskRecurrenceStatus.COMPLETED, nextOccurrenceDate: null })],
      }),
    );

    for (const action of ['Editar', 'Detener', 'Reanudar', 'Finalizar']) {
      expect(labels).not.toContain(action);
    }
  });

  it('reanudar llama al servicio sin pedir confirmación, avisa y recarga', () => {
    const component = create().componentInstance;

    component.resume(recurrence({ status: TaskRecurrenceStatus.STOPPED }));

    expect(confirmDialogMock.confirm).not.toHaveBeenCalled();
    expect(recurrencesServiceMock.resume).toHaveBeenCalledWith('rec-1');
    expect(toastMock.success).toHaveBeenCalledWith(
      'Tarea recurrente reanudada. Continúa desde su próxima fecha.',
    );
    expect(recurrencesServiceMock.getAll).toHaveBeenCalledTimes(2);
  });

  it('un error al reanudar se avisa con un toast y libera el botón', () => {
    const component = create().componentInstance;
    recurrencesServiceMock.resume.mockReturnValue(throwError(() => new Error('sin proceso')));

    component.resume(recurrence({ status: TaskRecurrenceStatus.STOPPED }));

    expect(toastMock.error).toHaveBeenCalledWith('sin proceso');
    expect(component.isBusy()).toBe(false);
  });

  it('finalizar pide confirmación peligrosa, llama al servicio, avisa y recarga', async () => {
    const component = create().componentInstance;

    await component.finalize(recurrence());

    expect(confirmDialogMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Finalizar tarea recurrente',
        confirmLabel: 'Finalizar',
        danger: true,
      }),
    );
    expect(recurrencesServiceMock.finalize).toHaveBeenCalledWith('rec-1');
    expect(toastMock.success).toHaveBeenCalledWith(
      'Tarea recurrente finalizada. Las ocurrencias existentes se conservan.',
    );
    expect(recurrencesServiceMock.getAll).toHaveBeenCalledTimes(2);
  });

  it('si se cancela la confirmación no finaliza nada', async () => {
    const component = create().componentInstance;
    confirmDialogMock.confirm.mockResolvedValue(false);

    await component.finalize(recurrence());

    expect(recurrencesServiceMock.finalize).not.toHaveBeenCalled();
  });

  it('un error al finalizar se avisa con un toast y libera el botón', async () => {
    const component = create().componentInstance;
    recurrencesServiceMock.finalize.mockReturnValue(throwError(() => new Error('falló')));

    await component.finalize(recurrence());

    expect(toastMock.error).toHaveBeenCalledWith('falló');
    expect(component.isBusy()).toBe(false);
  });

  it('editar abre el modal y al guardar reemplaza la serie en la lista', () => {
    const component = create().componentInstance;

    component.openEdit(recurrence());
    expect(component.editing()?.id).toBe('rec-1');

    component.onUpdated(recurrence({ title: 'Nuevo título' }));
    expect(component.recurrences()[0].title).toBe('Nuevo título');
  });

  it('formatDateOnly no corre la fecha por zona horaria', () => {
    expect(formatDateOnly('2026-12-05')).toBe('05/12/2026');
  });
});
