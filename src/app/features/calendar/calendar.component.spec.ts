import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { EventInput } from '@fullcalendar/core';
import { CalendarComponent } from './calendar.component';
import { DeadlineFormModalComponent } from '../../shared/components/deadline-form-modal/deadline-form-modal.component';
import { DeadlinesService } from '../../core/services/deadlines.service';
import { CatalogsService } from '../../core/services/catalogs.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { UsersService } from '../../core/services/users.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { CompanyService } from '../../core/services/company.service';
import { AdvisorResponse } from '../../core/models/advisor-backend.model';
import { AssignableUser } from '../../core/models/user-backend.model';
import { CatalogItem } from '../../core/models/catalog-backend.model';
import {
  DeadlineComputationType,
  DeadlineResponse,
  DeadlineScope,
  DeadlineStatus,
} from '../../core/models/deadline.model';
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
  readonly api = { refetchEvents: jest.fn(), changeView: jest.fn(), setOption: jest.fn() };
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
    createGeneral: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let advisorsServiceMock: { getAdvisors: jest.Mock };
  let usersServiceMock: { getAssignableUsers: jest.Mock };
  let legalProcessesServiceMock: { getLegalProcesses: jest.Mock };
  let confirmDialogServiceMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let authServiceMock: { currentUser: jest.Mock };
  let permissionsServiceMock: { hasPermission: jest.Mock; hasAnyPermission: jest.Mock };
  let companyServiceMock: { getCompany: jest.Mock };
  let consoleErrorSpy: jest.SpyInstance;
  let navigateSpy: jest.SpyInstance;

  const advisor: AdvisorResponse = {
    id: 'adv-1',
    userId: 'user-1',
    specialties: [],
    phone: null,
    professionalCard: null,
    mobileSecondary: null,
    rating: null,
    experienceYears: 5,
    isActive: true,
    companyId: 'company-1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    user: { id: 'user-1', firstName: 'Laura', lastName: 'Gómez', email: 'laura@lexar.com' },
  };

  const assignableUser: AssignableUser = {
    id: 'user-9',
    firstName: 'Marcela',
    lastName: 'Coordinadora',
    email: 'marcela@lexar.com',
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
    processType: null,
    contingency: null, // F40 §PRO-08 (ola 4b)
    amount: null,
    currency: null,
    court: null,
    caseNumber: null,
    internalCode: 'RGJ-000001',
    nextHearingDate: null,
    startDate: null,
    endDate: null,
    companyId: 'company-1',
    clientId: 'client-1',
    client: { id: 'client-1', fullName: 'Cliente Uno', email: 'cliente@x.com' },
    // F34 §3: campos obligatorios (nullable) del modelo.
    matterId: null,
    matter: null,
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
    // F41 §CAL-01: null/false — este plazo de fixture está colgado de un
    // proceso (proc-1), scope/blocksAgenda solo aplican a eventos generales.
    scope: null,
    blocksAgenda: false,
    durationMinutes: null,
    computationType: DeadlineComputationType.BUSINESS_DAYS,
    needsReview: false,
    createdBy: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  function configure(
    options: {
      openId?: string | null;
      currentUser?: AuthUser | null;
      hasFullDeadlineAccess?: boolean;
      canCreateTeamScope?: boolean;
      /** F41 (ola 4): deadlines.create — gatea el botón "Nuevo plazo" y el
       * modal de creación (ver canCreateDeadline() en el componente).
       * Por defecto true: la mayoría de estos tests ejercitan el flujo de
       * creación en sí, no el gating de permisos. */
      canCreateDeadline?: boolean;
      /** F41 (ola 4): deadlines.update — gatea el botón "Editar" del panel
       * de detalle. Por defecto true, mismo criterio que canCreateDeadline. */
      canEditDeadline?: boolean;
    } = {},
  ) {
    const { openId = null, currentUser = { id: 'user-1', email: 'a@x.com', roles: [], permissions: [] } } = options;

    deadlinesServiceMock = {
      getAll: jest.fn().mockReturnValue(of([deadline])),
      getOne: jest.fn().mockReturnValue(of(deadline)),
      create: jest.fn().mockReturnValue(of(deadline)),
      createGeneral: jest.fn().mockReturnValue(of(deadline)),
      update: jest.fn().mockReturnValue(of(deadline)),
      delete: jest.fn().mockReturnValue(of(undefined)),
    };
    catalogsServiceMock = { getActiveCatalog: jest.fn().mockReturnValue(of([deadlineType])) };
    advisorsServiceMock = {
      getAdvisors: jest.fn().mockReturnValue(of({ advisors: [advisor], total: 1, page: 1, limit: 100 })),
    };
    usersServiceMock = {
      getAssignableUsers: jest.fn().mockReturnValue(of({ users: [assignableUser] })),
    };
    legalProcessesServiceMock = {
      getLegalProcesses: jest.fn().mockReturnValue(
        of({ legalProcesses: [process], total: 1, page: 1, limit: 100 }),
      ),
    };
    confirmDialogServiceMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    authServiceMock = { currentUser: jest.fn().mockReturnValue(currentUser) };
    // F36 (ola 5): mock directo del servicio (no de AuthService), mismo
    // patrón que processes.component.spec.ts / tasks.component.spec.ts.
    companyServiceMock = {
      getCompany: jest.fn().mockReturnValue(of({ workingDays: [1, 2, 3, 4, 5] })),
    };
    permissionsServiceMock = {
      hasPermission: jest.fn((code: string) => {
        if (code === 'deadlines.create.team-scope') {
          return options.canCreateTeamScope ?? false;
        }
        if (code === 'deadlines.create') {
          return options.canCreateDeadline ?? true;
        }
        if (code === 'deadlines.update') {
          return options.canEditDeadline ?? true;
        }
        return options.hasFullDeadlineAccess ?? false;
      }),
      hasAnyPermission: jest.fn().mockReturnValue(options.hasFullDeadlineAccess ?? false),
    };

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
        { provide: UsersService, useValue: usersServiceMock },
        { provide: LegalProcessesService, useValue: legalProcessesServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: PermissionsService, useValue: permissionsServiceMock },
        { provide: CompanyService, useValue: companyServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    })
      .overrideComponent(CalendarComponent, {
        set: {
          // F41 (ola 4, rediseño 2026-09-23): el modal de creación se
          // reemplazó por <app-deadline-form-modal> (componente real, con
          // su propia batería de tests) — solo <full-calendar> se stubea,
          // porque es la librería pesada/dependiente de layout.
          imports: [ReactiveFormsModule, RouterLink, FullCalendarStubComponent, DeadlineFormModalComponent],
        },
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

  it('F41 §CAL-04 (ola 4): atenúa los días no hábiles de la empresa en el calendario (businessHours)', async () => {
    await configure();
    const { fixture } = createComponent();
    const stub = getStub(fixture);

    expect(stub.api.setOption).toHaveBeenCalledWith('businessHours', {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '00:00',
      endTime: '24:00',
    });
  });

  it('F41 §CAL-04 (ola 4): convierte domingo (ISO 7) al 0 que espera FullCalendar', async () => {
    await configure();
    companyServiceMock.getCompany.mockReturnValue(of({ workingDays: [1, 2, 3, 4, 5, 6, 7] }));
    const { fixture } = createComponent();
    const stub = getStub(fixture);

    expect(stub.api.setOption).toHaveBeenCalledWith(
      'businessHours',
      expect.objectContaining({ daysOfWeek: [1, 2, 3, 4, 5, 6, 0] }),
    );
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

  it('el modal de creación recibe processes/deadlineTypes/canCreateTeamScope (F41 rediseño 2026-09-23)', async () => {
    await configure({ canCreateTeamScope: true });
    const { fixture } = createComponent();
    fixture.componentInstance.openCreateModal();
    fixture.detectChanges();

    const modal = fixture.debugElement.query(By.directive(DeadlineFormModalComponent))
      .componentInstance as DeadlineFormModalComponent;
    expect(modal.isOpen()).toBe(true);
    expect(modal.processes()).toEqual([process]);
    expect(modal.deadlineTypes()).toEqual([deadlineType]);
    expect(modal.canCreateTeamScope()).toBe(true);
    expect(modal.showProcessField()).toBe(true);
  });

  it('onAssigneesChange (F41 ola 4: app-multi-select) reemplaza assigneeUserIds en el formulario', async () => {
    await configure();
    const { component } = createComponent();

    expect(component.createForm.get('assigneeUserIds')?.value).toEqual([]);

    await component.onAssigneesChange(['user-1', 'user-2']);
    expect(component.createForm.get('assigneeUserIds')?.value).toEqual(['user-1', 'user-2']);

    await component.onAssigneesChange([]);
    expect(component.createForm.get('assigneeUserIds')?.value).toEqual([]);
  });

  it('F41 (ola 4, reporte #4): elegir alcance "todo el equipo" limpia los asignados ya marcados', async () => {
    await configure({ canCreateTeamScope: true });
    const { component } = createComponent();

    await component.onAssigneesChange(['user-1']);
    expect(component.createForm.get('assigneeUserIds')?.value).toEqual(['user-1']);

    component.createForm.patchValue({ scope: DeadlineScope.TEAM });
    expect(component.createForm.get('assigneeUserIds')?.value).toEqual([]);
  });

  it('F41 (ola 4, correcciones #1): elegir "solo para mí" también limpia los asignados ya marcados', async () => {
    await configure();
    const { component } = createComponent();

    await component.onAssigneesChange(['user-1']);
    expect(component.createForm.get('assigneeUserIds')?.value).toEqual(['user-1']);

    component.createForm.patchValue({ scope: DeadlineScope.ONLY_ME });
    expect(component.createForm.get('assigneeUserIds')?.value).toEqual([]);
  });

  describe('F41 (ola 4, correcciones #2): relatedAdvisorUserIdsFor — fuente de "asignar a" según el proceso', () => {
    it('sin proceso, no hay asesores relacionados que priorizar', async () => {
      await configure();
      const { component } = createComponent();

      expect(component.relatedAdvisorUserIdsFor('')).toEqual([]);
      expect(component.relatedAdvisorUserIdsFor(null)).toEqual([]);
    });

    it('con proceso, devuelve los userId de sus asesores relacionados', async () => {
      await configure();
      const { component } = createComponent();
      component.processes.set([{ ...process, advisors: [advisor] }]);

      expect(component.relatedAdvisorUserIdsFor('proc-1')).toEqual(['user-1']);
    });

    it('con un proceso sin asesores relacionados, devuelve un array vacío', async () => {
      await configure();
      const { component } = createComponent();
      component.processes.set([{ ...process, advisors: [] }]);

      expect(component.relatedAdvisorUserIdsFor('proc-1')).toEqual([]);
    });
  });

  describe('F41 (ola 4, correcciones #2): confirmación al asignar a alguien no relacionado con el proceso', () => {
    it('pide confirmación y, si se acepta, aplica la selección', async () => {
      await configure();
      const { component } = createComponent();
      component.createForm.patchValue({ processId: 'proc-1' });
      component.processes.set([{ ...process, advisors: [] }]);
      confirmDialogServiceMock.confirm.mockResolvedValue(true);

      await component.onAssigneesChange(['user-1']);

      expect(confirmDialogServiceMock.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Asesor no relacionado con el proceso' }),
      );
      expect(component.createForm.get('assigneeUserIds')?.value).toEqual(['user-1']);
    });

    it('si se rechaza la confirmación, revierte a la selección anterior', async () => {
      await configure();
      const { component } = createComponent();
      component.createForm.patchValue({ processId: 'proc-1', assigneeUserIds: [] });
      component.processes.set([{ ...process, advisors: [] }]);
      confirmDialogServiceMock.confirm.mockResolvedValue(false);

      await component.onAssigneesChange(['user-1']);

      expect(component.createForm.get('assigneeUserIds')?.value).toEqual([]);
    });

    it('si el asesor agregado sí está relacionado con el proceso, no pide confirmación', async () => {
      await configure();
      const { component } = createComponent();
      component.createForm.patchValue({ processId: 'proc-1' });
      component.processes.set([{ ...process, advisors: [advisor] }]);

      await component.onAssigneesChange(['user-1']);

      expect(confirmDialogServiceMock.confirm).not.toHaveBeenCalled();
      expect(component.createForm.get('assigneeUserIds')?.value).toEqual(['user-1']);
    });
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

  it('submitCreate con datos válidos, crea el plazo, cierra el modal y navega a su ficha de edición', async () => {
    await configure();
    const { component } = createComponent();
    component.createForm.setValue({
      processId: 'proc-1',
      title: 'Nueva audiencia',
      typeId: 'type-1',
      dueAt: '2026-09-20T10:00',
      allDay: false,
      // scope: SELECTED — es el único scope que conserva assigneeUserIds (ver
      // el listener de scope.valueChanges en calendar.component.ts, que limpia
      // assigneeUserIds para cualquier otro scope); ONLY_ME/TEAM no admiten
      // asignados puntuales por diseño.
      assigneeUserIds: ['user-1'],
      scope: DeadlineScope.SELECTED,
      blocksAgenda: false,
    });

    component.submitCreate();

    expect(deadlinesServiceMock.create).toHaveBeenCalledWith('proc-1', {
      title: 'Nueva audiencia',
      typeId: 'type-1',
      dueAt: new Date('2026-09-20T10:00').toISOString(),
      allDay: false,
      assigneeUserIds: ['user-1'],
    });
    expect(deadlinesServiceMock.createGeneral).not.toHaveBeenCalled();
    expect(toastServiceMock.success).toHaveBeenCalled();
    expect(component.isCreating()).toBe(false);
    expect(component.createModalOpen()).toBe(false);
    // F41 (ola 4, rediseño 2026-09-23): ya no recarga el calendario in-place
    // — navega directo a la ficha del plazo recién creado (Notas, Cómputo
    // del término y Duración se completan ahí).
    expect(navigateSpy).toHaveBeenCalledWith(['/calendario/plazos', deadline.id], {
      queryParams: { returnTo: 'calendario' },
    });
  });

  it('F41 §CAL-01: submitCreate sin proceso crea un evento general con scope/blocksAgenda', async () => {
    await configure();
    const { component } = createComponent();
    component.createForm.setValue({
      processId: '',
      title: 'Capacitación interna',
      typeId: 'type-1',
      dueAt: '2026-09-20T10:00',
      allDay: false,
      assigneeUserIds: [],
      scope: DeadlineScope.SELECTED,
      blocksAgenda: true,
    });

    component.submitCreate();

    expect(deadlinesServiceMock.create).not.toHaveBeenCalled();
    expect(deadlinesServiceMock.createGeneral).toHaveBeenCalledWith({
      title: 'Capacitación interna',
      typeId: 'type-1',
      dueAt: new Date('2026-09-20T10:00').toISOString(),
      allDay: false,
      assigneeUserIds: [],
      scope: DeadlineScope.SELECTED,
      blocksAgenda: true,
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Evento creado correctamente.');
    expect(navigateSpy).toHaveBeenCalledWith(['/calendario/plazos', deadline.id], {
      queryParams: { returnTo: 'calendario' },
    });
  });

  describe('F41 (ola 4): sin deadlines.create, no se puede abrir el modal de creación', () => {
    it('no renderiza el botón "Nuevo plazo"', async () => {
      await configure({ canCreateDeadline: false });
      const { fixture } = createComponent();
      fixture.detectChanges();

      expect(
        fixture.nativeElement.textContent.includes('Nuevo plazo'),
      ).toBe(false);
    });

    it('openCreateModal() no abre el modal y muestra un toast, en vez del error crudo del backend', async () => {
      await configure({ canCreateDeadline: false });
      const { component } = createComponent();

      component.openCreateModal();

      expect(component.createModalOpen()).toBe(false);
      expect(toastServiceMock.error).toHaveBeenCalledWith(
        'No tienes permiso para crear plazos o eventos.',
      );
    });

    it('el click en una fecha del calendario tampoco abre el modal', async () => {
      await configure({ canCreateDeadline: false });
      const { component } = createComponent();
      const dateClickFn = component.calendarOptions.dateClick as unknown as DateClickFn;

      dateClickFn({ date: new Date('2026-01-01') });

      expect(component.createModalOpen()).toBe(false);
    });
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
      assigneeUserIds: [],
      scope: DeadlineScope.ONLY_ME,
      blocksAgenda: false,
    });

    component.submitCreate();

    expect(component.createError()).toBe('Ya existe un plazo similar');
    expect(toastServiceMock.error).toHaveBeenCalledWith('Ya existe un plazo similar');
    expect(component.isCreating()).toBe(false);
  });

  describe('F41 (ola 4, rediseño 2026-09-23): "Editar" navega a la ficha dedicada del plazo', () => {
    it('goToEdit cierra el detalle y navega a /calendario/plazos/:id con returnTo=calendario', async () => {
      await configure();
      const { component } = createComponent();
      component.selectedDeadline.set(deadline);

      component.goToEdit(deadline);

      expect(component.selectedDeadline()).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/calendario/plazos', deadline.id], {
        queryParams: { returnTo: 'calendario' },
      });
    });

    it('sin deadlines.update, no navega y muestra un toast', async () => {
      await configure({ canEditDeadline: false });
      const { component } = createComponent();

      component.goToEdit(deadline);

      expect(navigateSpy).not.toHaveBeenCalledWith(['/calendario/plazos', deadline.id], expect.anything());
      expect(toastServiceMock.error).toHaveBeenCalledWith(
        'No tienes permiso para editar plazos o eventos.',
      );
    });
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

  describe('F36 (ola 5): banner de alcance', () => {
    it('sin permiso deadlines.view.all, muestra el texto explicativo de alcance', async () => {
      await configure({ hasFullDeadlineAccess: false });
      const { component, fixture } = createComponent();

      expect(permissionsServiceMock.hasPermission).toHaveBeenCalledWith('deadlines.view.all');
      expect(component.hasFullDeadlineAccess()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain('Ves los plazos y audiencias a tu cargo.');
    });

    it('con permiso deadlines.view.all, no muestra el texto explicativo de alcance', async () => {
      await configure({ hasFullDeadlineAccess: true });
      const { component, fixture } = createComponent();

      expect(component.hasFullDeadlineAccess()).toBe(true);
      expect(fixture.nativeElement.textContent).not.toContain('Ves los plazos y audiencias a tu cargo.');
    });
  });
});
