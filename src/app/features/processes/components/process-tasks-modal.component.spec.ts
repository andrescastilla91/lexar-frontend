import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormBuilder, Validators } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProcessTasksModalComponent } from './process-tasks-modal.component';
import { TaskStatusControlComponent } from '../../../shared/components/task-status-control/task-status-control.component';
import { TaskPriority, TaskResponse, TaskTemplateResponse } from '../../../core/models/task.model';
import { TaskStatusResponse } from '../../../core/models/task-status.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';

describe('ProcessTasksModalComponent', () => {
  const fb = new FormBuilder();
  let httpMock: HttpTestingController;

  function buildForm() {
    return fb.nonNullable.group({
      title: ['', [Validators.required]],
      assigneeUserId: [''],
      dueAt: [''],
    });
  }

  const status: TaskStatusResponse = {
    id: 'st1',
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

  function buildTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
    return {
      id: 't1',
      title: 'Preparar poder especial',
      description: null,
      processId: 'p1',
      process: null,
      clientId: null,
      client: null,
      assigneeUserId: null,
      assignee: null,
      dueAt: null,
      status,
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

  const advisor: AdvisorResponse = {
    id: 'adv1',
    userId: 'u1',
    specialties: [],
    phone: null,
    professionalCard: null,
    mobileSecondary: null,
    rating: null,
    experienceYears: 3,
    isActive: true,
    companyId: 'c1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' },
  };

  const template: TaskTemplateResponse = {
    id: 'tpl1',
    name: 'Checklist demanda',
    processStage: null,
    items: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  function configure() {
    return TestBed.configureTestingModule({
      imports: [ProcessTasksModalComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .compileComponents()
      .then(() => {
        httpMock = TestBed.inject(HttpTestingController);
      });
  }

  function createComponent() {
    return TestBed.createComponent(ProcessTasksModalComponent);
  }

  afterEach(() => {
    httpMock?.verify();
  });

  it('no renderiza nada cuando isOpen es false', async () => {
    await configure();
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fixed')).toBeNull();
  });

  it('empieza en la pestaña de listado', async () => {
    await configure();
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTab()).toBe('list');
  });

  it('muestra el mensaje vacío en la pestaña de listado sin tareas', async () => {
    await configure();
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('tasks', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay tareas registradas para este proceso');
  });

  it('no muestra la pestaña de plantilla cuando no hay plantillas disponibles', async () => {
    await configure();
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('templates', []);
    fixture.detectChanges();

    const tabs: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.border-b button'));
    expect(tabs.some((b) => b.textContent?.includes('Desde plantilla'))).toBe(false);
  });

  it('cambia a la pestaña "Nueva tarea" al hacer clic', async () => {
    await configure();
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const tabs: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.border-b button'));
    const newTaskTab = tabs.find((b) => b.textContent?.includes('Nueva tarea'));
    newTaskTab!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.activeTab()).toBe('new');
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('emite submit al enviar el formulario de creación', async () => {
    await configure();
    const fixture = createComponent();
    const form = buildForm();
    form.patchValue({ title: 'Nueva tarea' });
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    fixture.componentInstance.activeTab.set('new');
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.submit.subscribe(spy);

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(spy).toHaveBeenCalled();
  });

  it('cambia a la pestaña de plantilla y emite instantiateTemplate con el id elegido', async () => {
    await configure();
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('templates', [template]);
    fixture.detectChanges();

    const tabs: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.border-b button'));
    const templateTab = tabs.find((b) => b.textContent?.includes('Desde plantilla'));
    templateTab!.click();
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.instantiateTemplate.subscribe(spy);

    fixture.nativeElement.querySelector('button.rounded-md.bg-navy-900').click();

    expect(spy).toHaveBeenCalledWith('tpl1');
  });

  it('deshabilita eliminar cuando la tarea está en un estado terminal', async () => {
    await configure();
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('tasks', [buildTask({ status: { ...status, isTerminal: true } })]);
    fixture.componentRef.setInput('statuses', [status]);
    fixture.detectChanges();

    const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[title="Tarea terminada: no se puede eliminar"]',
    );
    expect(deleteBtn.disabled).toBe(true);
  });

  it('emite deleteTask con la tarea al hacer clic en eliminar (no terminal)', async () => {
    await configure();
    const fixture = createComponent();
    const task = buildTask();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('tasks', [task]);
    fixture.componentRef.setInput('statuses', [status]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.deleteTask.subscribe(spy);

    fixture.nativeElement.querySelector('button[title="Eliminar tarea"]').click();

    expect(spy).toHaveBeenCalledWith(task);
  });

  it('propaga taskUpdated cuando TaskStatusControlComponent emite updated', async () => {
    await configure();
    const fixture = createComponent();
    const task = buildTask();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('tasks', [task]);
    fixture.componentRef.setInput('statuses', [status]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.taskUpdated.subscribe(spy);

    const control = fixture.debugElement.query(By.directive(TaskStatusControlComponent));
    const updatedTask = buildTask({ status: { ...status, id: 'st2', label: 'En progreso' } });
    control.componentInstance.updated.emit(updatedTask);

    expect(spy).toHaveBeenCalledWith(updatedTask);
  });

  // F28
  it('el botón "Editar tarea" abre el modal de edición con la tarea', async () => {
    await configure();
    const fixture = createComponent();
    const task = buildTask();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('tasks', [task]);
    fixture.componentRef.setInput('statuses', [status]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[title="Editar tarea"]').click();

    expect(fixture.componentInstance.editingTask()).toEqual(task);
    expect(fixture.componentInstance.editModalOpen()).toBe(true);
  });

  it('propaga taskUpdated cuando el modal de edición emite updated', async () => {
    await configure();
    const fixture = createComponent();
    const task = buildTask();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('tasks', [task]);
    fixture.componentRef.setInput('statuses', [status]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.taskUpdated.subscribe(spy);

    const edited = buildTask({ title: 'Editada' });
    fixture.componentInstance.onTaskEdited(edited);

    expect(spy).toHaveBeenCalledWith(edited);
  });

  it('emite close al hacer clic en cerrar', async () => {
    await configure();
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('tasks', []);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.close.subscribe(spy);

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const closeBtn = buttons.find((b) => b.textContent?.trim() === 'Cerrar');
    closeBtn!.click();

    expect(spy).toHaveBeenCalled();
  });

  // F40 Ola 4a — ajuste 2026-09-21 (feedback punto 3): en modo embedded el
  // tab-strip interno se reemplaza por un header título+acciones; el
  // listado queda siempre visible y "Nueva tarea"/"Desde plantilla" abren
  // cada uno su propio diálogo flotante.
  describe('modo embedded (F40 Ola 4a, feedback punto 3)', () => {
    it('muestra el header con el conteo y "+ Nueva tarea", sin "Desde plantilla" si no hay plantillas', async () => {
      await configure();
      const fixture = createComponent();
      fixture.componentRef.setInput('form', buildForm());
      fixture.componentRef.setInput('embedded', true);
      fixture.componentRef.setInput('tasks', [buildTask()]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Tareas (1)');
      expect(fixture.nativeElement.textContent).toContain('Preparar poder especial');
      const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
      expect(buttons.some((b) => b.textContent?.trim() === '+ Nueva tarea')).toBe(true);
      expect(buttons.some((b) => b.textContent?.trim() === 'Desde plantilla')).toBe(false);
    });

    it('muestra "Desde plantilla" en el header cuando hay plantillas disponibles', async () => {
      await configure();
      const fixture = createComponent();
      fixture.componentRef.setInput('form', buildForm());
      fixture.componentRef.setInput('embedded', true);
      fixture.componentRef.setInput('templates', [template]);
      fixture.detectChanges();

      const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
      expect(buttons.some((b) => b.textContent?.trim() === 'Desde plantilla')).toBe(true);
    });

    it('abre el diálogo flotante de "Nueva tarea" al hacer clic en el header', async () => {
      await configure();
      const fixture = createComponent();
      fixture.componentRef.setInput('form', buildForm());
      fixture.componentRef.setInput('embedded', true);
      fixture.detectChanges();

      const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
      buttons.find((b) => b.textContent?.trim() === '+ Nueva tarea')!.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.newTaskFormOpen()).toBe(true);
      expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    });

    it('abre el diálogo flotante de "Desde plantilla" al hacer clic en el header', async () => {
      await configure();
      const fixture = createComponent();
      fixture.componentRef.setInput('form', buildForm());
      fixture.componentRef.setInput('embedded', true);
      fixture.componentRef.setInput('templates', [template]);
      fixture.detectChanges();

      const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
      buttons.find((b) => b.textContent?.trim() === 'Desde plantilla')!.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.templateFormOpen()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Crear tareas desde plantilla');
    });

    it('cierra el diálogo de "Nueva tarea" automáticamente cuando el envío termina sin error', async () => {
      await configure();
      const fixture = createComponent();
      fixture.componentRef.setInput('form', buildForm());
      fixture.componentRef.setInput('embedded', true);
      fixture.detectChanges();
      fixture.componentInstance.newTaskFormOpen.set(true);

      fixture.componentRef.setInput('isSubmitting', true);
      fixture.detectChanges();
      fixture.componentRef.setInput('isSubmitting', false);
      fixture.detectChanges();

      expect(fixture.componentInstance.newTaskFormOpen()).toBe(false);
    });

    it('no cierra "Desde plantilla" automáticamente tras instanciar (se cierra solo manualmente)', async () => {
      await configure();
      const fixture = createComponent();
      fixture.componentRef.setInput('form', buildForm());
      fixture.componentRef.setInput('embedded', true);
      fixture.componentRef.setInput('templates', [template]);
      fixture.detectChanges();
      fixture.componentInstance.templateFormOpen.set(true);

      fixture.componentRef.setInput('isInstantiating', true);
      fixture.detectChanges();
      fixture.componentRef.setInput('isInstantiating', false);
      fixture.detectChanges();

      expect(fixture.componentInstance.templateFormOpen()).toBe(true);
    });
  });
});
