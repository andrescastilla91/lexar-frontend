import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TaskEditModalComponent } from './task-edit-modal.component';
import { TasksService } from '../../../core/services/tasks.service';
import { ToastService } from '../../../core/services/toast.service';
import { TaskPriority, TaskResponse } from '../../../core/models/task.model';

describe('TaskEditModalComponent (F28)', () => {
  let tasksServiceMock: { update: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  function buildTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
    return {
      id: 'task-1',
      title: 'Redactar demanda',
      description: 'Desc original',
      processId: null,
      process: null,
      clientId: null,
      client: null,
      assigneeUserId: null,
      assignee: null,
      dueAt: null,
      status: {
        id: 's1',
        code: 'todo',
        label: 'Por hacer',
        color: null,
        isTerminal: false,
        requiresApproval: false,
        requiresNote: false,
      },
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

  function createComponent() {
    tasksServiceMock = { update: jest.fn() };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TaskEditModalComponent],
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(TaskEditModalComponent);
    return { fixture, component: fixture.componentInstance };
  }

  it('precarga el formulario con los datos de la tarea al abrir', () => {
    const { fixture, component } = createComponent();
    fixture.componentRef.setInput('task', buildTask({ title: 'Título X', description: 'Desc X' }));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(component.form.getRawValue().title).toBe('Título X');
    expect(component.form.getRawValue().description).toBe('Desc X');
  });

  it('muestra el formulario en solo lectura (sin form) si la tarea está en estado terminal', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput(
      'task',
      buildTask({ status: { id: 's3', code: 'done', label: 'Completada', color: null, isTerminal: true, requiresApproval: false, requiresNote: false } }),
    );
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no admite cambios');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('submit hace PATCH con los campos del formulario y emite updated', () => {
    const { fixture, component } = createComponent();
    const task = buildTask();
    fixture.componentRef.setInput('task', task);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const updatedTask = { ...task, title: 'Nuevo título' };
    tasksServiceMock.update.mockReturnValue(of(updatedTask));
    const emitted: TaskResponse[] = [];
    component.updated.subscribe((t) => emitted.push(t));
    let closed = false;
    component.close.subscribe(() => (closed = true));

    component.form.patchValue({ title: 'Nuevo título' });
    component.submit();

    expect(tasksServiceMock.update).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ title: 'Nuevo título' }),
    );
    expect(toastServiceMock.success).toHaveBeenCalled();
    expect(emitted).toEqual([updatedTask]);
    expect(closed).toBe(true);
  });

  it('no manda la clave dueAt si el campo quedó vacío (evita limpiar a época 1970)', () => {
    const { fixture, component } = createComponent();
    fixture.componentRef.setInput('task', buildTask({ dueAt: null }));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    tasksServiceMock.update.mockReturnValue(of(buildTask()));
    component.submit();

    const sentBody = tasksServiceMock.update.mock.calls[0][1];
    expect('dueAt' in sentBody).toBe(false);
  });

  it('manda assigneeUserId null cuando se deja "Sin asignar"', () => {
    const { fixture, component } = createComponent();
    fixture.componentRef.setInput('task', buildTask({ assigneeUserId: 'u1' }));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    tasksServiceMock.update.mockReturnValue(of(buildTask()));
    component.form.patchValue({ assigneeUserId: '' });
    component.submit();

    expect(tasksServiceMock.update).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ assigneeUserId: null }),
    );
  });

  it('no permite submit si el título está vacío', () => {
    const { fixture, component } = createComponent();
    fixture.componentRef.setInput('task', buildTask());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    component.form.patchValue({ title: '' });
    component.submit();

    expect(tasksServiceMock.update).not.toHaveBeenCalled();
    expect(component.formError()).toBeTruthy();
  });

  it('en error, muestra el mensaje y no cierra el modal', () => {
    const { fixture, component } = createComponent();
    fixture.componentRef.setInput('task', buildTask());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    tasksServiceMock.update.mockReturnValue(throwError(() => new Error('Tarea terminada')));
    let closed = false;
    component.close.subscribe(() => (closed = true));

    component.submit();

    expect(toastServiceMock.error).toHaveBeenCalled();
    expect(component.formError()).toBe('Tarea terminada');
    expect(closed).toBe(false);
  });
});
