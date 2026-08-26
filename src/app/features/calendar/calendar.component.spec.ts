import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { EventInput } from '@fullcalendar/core';
import { CalendarComponent } from './calendar.component';
import { DeadlinesService } from '../../core/services/deadlines.service';
import { CatalogsService } from '../../core/services/catalogs.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { AdvisorResponse, AdvisorStatus } from '../../core/models/advisor-backend.model';
import { CatalogItem } from '../../core/models/catalog-backend.model';
import { DeadlineResponse, DeadlineStatus } from '../../core/models/deadline.model';
import { LegalProcessResponse, ProcessStatus } from '../../core/models/legal-process.model';
import { AuthUser } from '../../core/models/auth.model';

/**
 * Stub de `<full-calendar>` — evita instanciar la librería real de
 * FullCalendar (pesada, dependiente de layout de navegador) en jsdom.
 * El `@ViewChild('calendar')` del componente se resuelve por la variable
 * de plantilla, no por el tipo, así que este stub lo satisface igual.
 */
@Component({
  selector: 'full-calendar',
  standalone: true,
  template: '',
})
class FullCalendarStubComponent {
  @Input() options: unknown;
  readonly api = { refetchEvents: jest.fn(), changeView: jest.fn() };
  getApi() {
    return this.api;
  }
}

/**
 * `CalendarOptions.events/eventClick/dateClick` están tipados por FullCalendar
 * con un DSL de refiners que acepta múltiples formas de entrada (string,
 * array, objeto, función). El componente solo usa la variante función con
 * la firma de abajo, así que la fijamos localmente para invocar los
 * callbacks en los tests sin recurrir a `any`.
 */
type EventsFn = (
  fetchInfo: { startStr: string; endStr: string },
  successCallback: (events: EventInput[]) => void,
  failureCallback: (error: Error) => void,
) => void;

type EventClickFn = (arg: { event: { extendedProps: { deadline: DeadlineResponse } } }) => void;

type DateClickFn = (arg: { date: Date }) => void;

describe('CalendarComponent', () => {
  let deadlinesServiceMock: {
    getAll: jest.Mock;
    getOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let advisorsServiceMock: { getAdvisors: jest.Mock };
  let legalProcessesServiceMock: { getLegalProcesses: jest.Mock };
  let confirmDialogServiceMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let authServiceMock: { currentUser: jest.Mock };
  let consoleErrorSpy: jest.SpyInstance;
  let navigateSpy: jest.SpyInstance;

  const advisor: AdvisorResponse = {
    id: 'adv-1',
    userId: 'user-1',
    specialty: null,
    phone: null,
    status: AdvisorStatus.AVAILABLE,
    rating: null,
    experienceYears: 5,
    isActive: true,
    companyId: 'company-1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    user: { id: 'user-1', firstName: 'Laura', lastName: 'Gómez', email: 'laura@lexar.com' },
  };

  const deadlineType: CatalogItem = {
    id: 'type-1',
    catalogType: 'deadline_type',
    code: 'AUDIENCIA',
    label: 'Audiencia',
    color: 'danger',
    sortOrder: 1,
    isActive: true,
    isSystem: false,
  };

  const process: LegalProcessResponse = {
    id: 'proc-1',
    title: 'Demanda civil',
    description: null,
    status: ProcessStatus.ACTIVE,
    stage: null,
    riskLevel: null,
    court: null,
    caseNumber: null,
    nextHearingDate: null,
    startDate: null,
    endDate: null,
    companyId: 'company-1',
    clientId: 'client-1',
    client: { id: 'client-1', fullName: 'Cliente Uno', email: 'cliente@x.com' },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const deadline: DeadlineResponse = {
    id: 'deadline-1',
    processId: 'proc-1',
    process: { id: 'proc-1', title: 'Demanda civil' },
    title: 'Audiencia inicial',
    type: { id: 'type-1', code: 'AUDIENCIA', label: 'Audiencia', color: 'danger' },
    dueAt: '2026-09-01T10:00:00Z',
    allDay: false,
    notes: null,
    status: DeadlineStatus.PENDING,
    assignees: [],
    createdBy: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  function configure(options: { openId?: string | null; currentUser?: AuthUser | null } = {}) {
    const { openId = null, currentUser = { id: 'user-1', email: 'a@x.com', roles: [], permissions: [] } } = options;

    deadlinesServiceMock = {
      getAll: jest.fn().mockReturnValue(of([deadline])),
      getOne: jest.fn().mockReturnValue(of(deadline)),
      create: jest.fn().mockReturnValue(of(deadline)),
      update: jest.fn().mockReturnValue(of(deadline)),
      delete: jest.fn().mockReturnValue(of(undefined)),
    };
    catalogsServiceMock = { getActiveCatalog: jest.fn().mockReturnValue(of([deadlineType])) };
    advisorsServiceMock = {
      getAdvisors: jest.fn().mockReturnValue(of({ advisors: [advisor], total: 1, page: 1, limit: 100 })),
    };
    legalProcessesServiceMock = {
      getLegalProcesses: jest.fn().mockReturnValue(
        of({ legalProcesses: [process], total: 1, page: 1, limit: 100 }),
      ),
    };
    confirmDialogServiceMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    authServiceMock = { currentUser: jest.fn().mockReturnValue(currentUser) };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => openId } },
    };

    return TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        provideRouter([]),
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: AdvisorsService, useValue: advisorsServiceMock },
        { provide: LegalProcessesService, useValue: legalProcessesServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    })
      .overrideComponent(CalendarComponent, {
        set: { imports: [ReactiveFormsModule, RouterLink, FullCalendarStubComponent] },
      })
      .compileComponents()
      .then(() => {
        const router = TestBed.inject(Router);
        // El componente llama a router.navigate({ relativeTo: this.route, ... }) al abrir un
        // plazo por ?openId=; con un ActivatedRoute mockeado (solo snapshot.queryParamMap) el
        // Router real no tiene suficiente contexto interno para resolver `relativeTo`, así que
        // se espía sin delegar en la implementación real.
        navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  function getStub(fixture: ComponentFixture<CalendarComponent>): FullCalendarStubComponent {
    const debugEl = fixture.debugElement.query(By.directive(FullCalendarStubComponent));
    if (!debugEl) {
      throw new Error('FullCalendarStubComponent no fue renderizado');
    }
    return debugEl.componentInstance as FullCalendarStubComponent;
  }

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('al construirse, carga asesores, tipos de plazo y procesos', async () => {
    await configure();
    const { component } = createComponent();

    expect(advisorsServiceMock.getAdvisors).toHaveBeenCalledWith(1, 100);
    expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('deadline_type');
    expect(legalProcessesServiceMock.getLegalProcesses).toHaveBeenCalledWith(1, 100);
    expect(component.advisors()).toEqual([advisor]);
    expect(component.deadlineTypes()).toEqual([deadlineType]);
    expect(component.processes()).toEqual([process]);
  });

  it('si falla la carga de asesores o procesos, registra el error en consola sin romper', async () => {
    await configure();
    advisorsServiceMock.getAdvisors.mockReturnValue(throwError(() => new Error('boom')));
    legalProcessesServiceMock.getLegalProcesses.mockReturnValue(throwError(() => new Error('boom')));

    const { component } = createComponent();

    expect(component.advisors()).toEqual([]);
    expect(component.processes()).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('sin openId en la query, no abre ningún detalle', async () => {
    await configure({ openId: null });
    const { component } = createComponent();

    expect(deadlinesServiceMock.getOne).not.toHaveBeenCalled();
    expect(component.selectedDeadline()).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('con openId en la query, carga y abre el detalle del plazo (F18)', async () => {
    await configure({ openId: 'deadline-1' });
    const { component } = createComponent();

    expect(deadlinesServiceMock.getOne).toHaveBeenCalledWith('deadline-1');
    expect(component.selectedDeadline()).toEqual(deadline);
    expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {}, replaceUrl: true }));
  });

  it('con openId que falla al cargar, no rompe (error silencioso)', async () => {
    await configure({ openId: 'missing' });
    deadlinesServiceMock.getOne.mockReturnValue(throwError(() => new Error('not found')));

    const { component } = createComponent();

    expect(component.selectedDeadline()).toBeNull();
  });

  it('toggleOnlyMine sin usuario actual, no hace nada', async () => {
    await configure({ currentUser: null });
    const { component } = createComponent();

    component.toggleOnlyMine();

    expect(component.onlyMine()).toBe(false);
  });

  it('toggleOnlyMine con usuario, activa el filtro "mis plazos" y cambia a vista de lista', async () => {
    await configure();
    const { component, fixture } = createComponent();
    const stub = getStub(fixture);

    component.toggleOnlyMine();

    expect(component.onlyMine()).toBe(true);
    expect(component.filterForm.value.assignee).toBe('user-1');
    expect(stub.api.changeView).toHaveBeenCalledWith('listWeek');
  });

  it('al cambiar manualmente el filtro de asesor mientras "mis plazos" está activo, lo desactiva', async () => {
    await configure();
    const { component } = createComponent();
    component.toggleOnlyMine();
    expect(component.onlyMine()).toBe(true);

    component.filterForm.patchValue({ assignee: 'otro-asesor' });

    expect(component.onlyMine()).toBe(false);
  });

  it('calendarOptions.events mapea los plazos a eventos, con color y clases por estado', async () => {
    await configure();
    const doneDeadline: DeadlineResponse = { ...deadline, id: 'd2', status: DeadlineStatus.DONE };
    deadlinesServiceMock.getAll.mockReturnValue(of([deadline, doneDeadline]));
    const { component } = createComponent();

    const successCallback = jest.fn();
    const failureCallback = jest.fn();
    const eventsFn = component.calendarOptions.events as unknown as EventsFn;
    eventsFn({ startStr: '2026-09-01', endStr: '2026-09-30' }, successCallback, failureCallback);

    expect(deadlinesServiceMock.getAll).toHaveBeenCalledWith({
      from: '2026-09-01',
      to: '2026-09-30',
      assignee: undefined,
      type: undefined,
      processId: undefined,
    });
    expect(successCallback).toHaveBeenCalledTimes(1);
    const events = successCallback.mock.calls[0][0];
    expect(events[0]).toMatchObject({ id: 'deadline-1', title: 'Audiencia inicial', allDay: false, classNames: [] });
    expect(events[1]).toMatchObject({ id: 'd2', classNames: ['opacity-60', 'line-through'] });
  });

  it('calendarOptions.events en error, notifica por toast e invoca failureCallback', async () => {
    await configure();
    const error = { message: 'Error al cargar el calendario' };
    deadlinesServiceMock.getAll.mockReturnValue(throwError(() => error));
    const { component } = createComponent();

    const successCallback = jest.fn();
    const failureCallback = jest.fn();
    const eventsFn = component.calendarOptions.events as unknown as EventsFn;
    eventsFn({ startStr: '2026-09-01', endStr: '2026-09-30' }, successCallback, failureCallback);

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al cargar el calendario');
    expect(failureCallback).toHaveBeenCalledWith(error);
    expect(successCallback).not.toHaveBeenCalled();
  });

  it('calendarOptions.eventClick abre el detalle del plazo asociado', async () => {
    await configure();
    const { component } = createComponent();

    const eventClickFn = component.calendarOptions.eventClick as unknown as EventClickFn;
    eventClickFn({ event: { extendedProps: { deadline } } });

    expect(component.selectedDeadline()).toEqual(deadline);
  });

  it('calendarOptions.dateClick abre el modal de creación con la fecha prellenada', async () => {
    await configure();
    const { component } = createComponent();
    const date = new Date(2026, 8, 15, 9, 30);

    const dateClickFn = component.calendarOptions.dateClick as unknown as DateClickFn;
    dateClickFn({ date });

    expect(component.createModalOpen()).toBe(true);
    expect(component.createForm.value.dueAt).toBe('2026-09-15T09:30');
  });

  it('closeDetail limpia el plazo seleccionado', async () => {
    await configure();
    const { component } = createComponent();
    component.selectedDeadline.set(deadline);

    component.closeDetail();

    expect(component.selectedDeadline()).toBeNull();
  });

  it('markDone marca el plazo como completado y refresca el calendario', async () => {
    await configure();
    const { component, fixture } = createComponent();
    const stub = getStub(fixture);
    component.selectedDeadline.set(deadline);

    component.markDone(deadline);

    expect(deadlinesServiceMock.update).toHaveBeenCalledWith('deadline-1', { status: DeadlineStatus.DONE });
    expect(toastServiceMock.success).toHaveBeenCalled();
    expect(component.selectedDeadline()).toBeNull();
    expect(stub.api.refetchEvents).toHaveBeenCalled();
  });

  it('markDone en error, notifica y registra en consola', async () => {
    await configure();
    deadlinesServiceMock.update.mockReturnValue(throwError(() => new Error('No se pudo actualizar')));
    const { component } = createComponent();

    component.markDone(deadline);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo actualizar');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('openCreateModal sin fecha prellenada, resetea el formulario vacío', async () => {
    await configure();
    const { component } = createComponent();

    component.openCreateModal();

    expect(component.createModalOpen()).toBe(true);
    expect(component.createError()).toBeNull();
    expect(component.createForm.value.dueAt).toBe('');
  });

  it('closeCreateModal cierra el modal y limpia el error', async () => {
    await configure();
    const { component } = createComponent();
    component.createModalOpen.set(true);
    component.createError.set('algo falló');

    component.closeCreateModal();

    expect(component.createModalOpen()).toBe(false);
    expect(component.createError()).toBeNull();
  });

  it('isAssigneeSelected y toggleAssignee agregan y quitan ids del formulario', async () => {
    await configure();
    const { component } = createComponent();

    expect(component.isAssigneeSelected('user-1')).toBe(false);

    component.toggleAssignee('user-1');
    expect(component.isAssigneeSelected('user-1')).toBe(true);

    component.toggleAssignee('user-1');
    expect(component.isAssigneeSelected('user-1')).toBe(false);
  });

  it('submitCreate no hace nada si ya hay una creación en curso', async () => {
    await configure();
    const { component } = createComponent();
    component.isCreating.set(true);

    component.submitCreate();

    expect(deadlinesServiceMock.create).not.toHaveBeenCalled();
  });

  it('submitCreate con campos obligatorios vacíos, marca el formulario y muestra error', async () => {
    await configure();
    const { component } = createComponent();

    component.submitCreate();

    expect(deadlinesServiceMock.create).not.toHaveBeenCalled();
    expect(component.createError()).toBe('Completa los campos obligatorios.');
    expect(component.createForm.touched).toBe(true);
  });

  it('submitCreate con datos válidos, crea el plazo y cierra el modal', async () => {
    await configure();
    const { component, fixture } = createComponent();
    const stub = getStub(fixture);
    component.createForm.setValue({
      processId: 'proc-1',
      title: 'Nueva audiencia',
      typeId: 'type-1',
      dueAt: '2026-09-20T10:00',
      allDay: false,
      notes: 'Notas',
      assigneeUserIds: ['user-1'],
    });

    component.submitCreate();

    expect(deadlinesServiceMock.create).toHaveBeenCalledWith('proc-1', {
      title: 'Nueva audiencia',
      typeId: 'type-1',
      dueAt: new Date('2026-09-20T10:00').toISOString(),
      allDay: false,
      notes: 'Notas',
      assigneeUserIds: ['user-1'],
    });
    expect(toastServiceMock.success).toHaveBeenCalled();
    expect(component.isCreating()).toBe(false);
    expect(component.createModalOpen()).toBe(false);
    expect(stub.api.refetchEvents).toHaveBeenCalled();
  });

  it('submitCreate en error del backend, muestra el mensaje y libera el estado de creación', async () => {
    await configure();
    deadlinesServiceMock.create.mockReturnValue(throwError(() => new Error('Ya existe un plazo similar')));
    const { component } = createComponent();
    component.createForm.setValue({
      processId: 'proc-1',
      title: 'Nueva audiencia',
      typeId: 'type-1',
      dueAt: '2026-09-20T10:00',
      allDay: false,
      notes: '',
      assigneeUserIds: [],
    });

    component.submitCreate();

    expect(component.createError()).toBe('Ya existe un plazo similar');
    expect(toastServiceMock.error).toHaveBeenCalledWith('Ya existe un plazo similar');
    expect(component.isCreating()).toBe(false);
  });

  it('deleteDeadline si el usuario cancela la confirmación, no elimina', async () => {
    await configure();
    confirmDialogServiceMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.deleteDeadline(deadline);

    expect(deadlinesServiceMock.delete).not.toHaveBeenCalled();
  });

  it('deleteDeadline confirmado, elimina el plazo y refresca el calendario', async () => {
    await configure();
    const { component, fixture } = createComponent();
    const stub = getStub(fixture);
    component.selectedDeadline.set(deadline);

    await component.deleteDeadline(deadline);

    expect(deadlinesServiceMock.delete).toHaveBeenCalledWith('deadline-1');
    expect(toastServiceMock.success).toHaveBeenCalled();
    expect(component.selectedDeadline()).toBeNull();
    expect(stub.api.refetchEvents).toHaveBeenCalled();
  });

  it('deleteDeadline confirmado pero el backend falla, notifica el error', async () => {
    await configure();
    confirmDialogServiceMock.confirm.mockResolvedValue(true);
    deadlinesServiceMock.delete.mockReturnValue(throwError(() => new Error('No se pudo eliminar')));
    const { component } = createComponent();

    await component.deleteDeadline(deadline);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo eliminar');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
