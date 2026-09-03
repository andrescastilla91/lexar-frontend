import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardTodayTasksWidgetComponent } from './dashboard-today-tasks-widget.component';
import { TaskResponse } from '../../../core/models/task.model';

describe('DashboardTodayTasksWidgetComponent (F32 PR1)', () => {
  const task: TaskResponse = {
    id: 't1',
    title: 'Preparar alegato',
    priority: 'HIGH',
    status: { code: 'PENDING', label: 'Pendiente', isTerminal: false },
    dueAt: new Date().toISOString(),
    process: { id: 'p1', title: 'Proceso Uno' },
  } as unknown as TaskResponse;

  function createComponent(tasks: TaskResponse[] = [], isLoading = false) {
    const fixture = TestBed.createComponent(DashboardTodayTasksWidgetComponent);
    fixture.componentRef.setInput('tasks', tasks);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardTodayTasksWidgetComponent],
      providers: [provideRouter([])],
    });
  });

  it('muestra el estado vacío cuando no hay tareas hoy', () => {
    const { fixture } = createComponent([], false);

    expect(fixture.nativeElement.textContent).toContain('No tienes tareas pendientes con vencimiento hoy.');
  });

  it('lista las tareas recibidas', () => {
    const { fixture } = createComponent([task], false);

    expect(fixture.nativeElement.textContent).toContain('Preparar alegato');
    expect(fixture.nativeElement.textContent).toContain('Proceso Uno');
  });

  it('muestra "Tarea general" cuando la tarea no tiene proceso asociado', () => {
    const looseTask = { ...task, process: null } as unknown as TaskResponse;
    const { fixture } = createComponent([looseTask], false);

    expect(fixture.nativeElement.textContent).toContain('Tarea general');
  });
});
