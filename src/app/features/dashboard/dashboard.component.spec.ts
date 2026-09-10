import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardWidgetsService } from '../../core/services/dashboard-widgets.service';
import { AuthService } from '../../core/services/auth.service';
import { DeadlinesService } from '../../core/services/deadlines.service';
import { TasksService } from '../../core/services/tasks.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardSummary, OnboardingChecklist } from '../../core/models/dashboard.model';
import { AuthUser } from '../../core/models/auth.model';

const FULL_LAYOUT = [
  'stats',
  'today-deadlines',
  'today-tasks',
  'high-risk-processes',
  'upcoming-hearings',
  'recent-documents',
  'top-advisors',
];

describe('DashboardComponent — checklist de primeros pasos (F10)', () => {
  let dashboardServiceMock: { getSummary: jest.Mock; getOnboardingChecklist: jest.Mock };
  let dashboardWidgetsServiceMock: { getWidgets: jest.Mock };
  let deadlinesServiceMock: { getAll: jest.Mock };
  let tasksServiceMock: { getAll: jest.Mock };

  const summary: DashboardSummary = {
    totalProcesses: 0,
    processesByStatus: [],
    activeClients: 0,
    documentsThisMonth: 0,
    upcomingHearingsCount: 0,
    upcomingHearings: [],
    highRiskProcessesCount: 0,
    highRiskProcesses: [],
    recentDocuments: [],
    topAdvisors: [],
  };

  function configure(checklist: OnboardingChecklist): void {
    dashboardServiceMock = {
      getSummary: jest.fn().mockReturnValue(of(summary)),
      getOnboardingChecklist: jest.fn().mockReturnValue(of(checklist)),
    };
    deadlinesServiceMock = {
      getAll: jest.fn().mockReturnValue(of([])),
    };
    tasksServiceMock = {
      getAll: jest.fn().mockReturnValue(of([])),
    };
    dashboardWidgetsServiceMock = {
      getWidgets: jest.fn().mockReturnValue(of({ catalog: [], layout: FULL_LAYOUT })),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: DashboardWidgetsService, useValue: dashboardWidgetsServiceMock },
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        {
          provide: AuthService,
          useValue: { currentUser: signal<AuthUser | null>({ email: 'ana@bufete.com', roles: [], permissions: [], isOwner: true }) },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('muestra la card cuando el wizard no está completo', () => {
    configure({
      emailVerified: false,
      companyProfileComplete: false,
      firstClientCreated: false,
      firstProcessCreated: false,
      firstDocumentUploaded: false,
      teamInvited: false,
      wizardCompleted: false,
    });
    const { component, fixture } = createComponent();

    expect(component.showChecklist()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Primeros pasos');
  });

  it('oculta la card cuando el wizard ya está completo', () => {
    configure({
      emailVerified: true,
      companyProfileComplete: true,
      firstClientCreated: true,
      firstProcessCreated: true,
      firstDocumentUploaded: true,
      teamInvited: true,
      wizardCompleted: true,
    });
    const { component } = createComponent();

    expect(component.showChecklist()).toBe(false);
  });

  // BUG-11: aunque llegara un checklist con wizard incompleto (hoy el
  // backend ya no lo calcula para no-dueños y manda null), la card no debe
  // mostrarse a un usuario invitado — defensa en profundidad.
  it('no muestra la card si el usuario actual no es el dueño, aunque el checklist esté incompleto', () => {
    dashboardServiceMock = {
      getSummary: jest.fn().mockReturnValue(of(summary)),
      getOnboardingChecklist: jest.fn().mockReturnValue(
        of({
          emailVerified: false,
          companyProfileComplete: false,
          firstClientCreated: false,
          firstProcessCreated: false,
          firstDocumentUploaded: false,
          teamInvited: false,
          wizardCompleted: false,
        }),
      ),
    };
    deadlinesServiceMock = { getAll: jest.fn().mockReturnValue(of([])) };
    tasksServiceMock = { getAll: jest.fn().mockReturnValue(of([])) };
    dashboardWidgetsServiceMock = {
      getWidgets: jest.fn().mockReturnValue(of({ catalog: [], layout: FULL_LAYOUT })),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: DashboardWidgetsService, useValue: dashboardWidgetsServiceMock },
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        {
          provide: AuthService,
          useValue: { currentUser: signal<AuthUser | null>({ email: 'invitado@bufete.com', roles: [], permissions: [], isOwner: false }) },
        },
      ],
    });

    const { component } = createComponent();

    expect(component.showChecklist()).toBe(false);
  });

  // BUG-18: el saludo del hero usa el nombre real (AuthUser.firstName),
  // no un fragmento derivado del email — antes 'acastilla@x.com' producía
  // "Hola Acastilla", nunca el nombre de la persona.
  it('el saludo del hero usa firstName y no un fragmento del email', () => {
    dashboardServiceMock = {
      getSummary: jest.fn().mockReturnValue(of(summary)),
      getOnboardingChecklist: jest.fn().mockReturnValue(of(null)),
    };
    deadlinesServiceMock = { getAll: jest.fn().mockReturnValue(of([])) };
    tasksServiceMock = { getAll: jest.fn().mockReturnValue(of([])) };
    dashboardWidgetsServiceMock = {
      getWidgets: jest.fn().mockReturnValue(of({ catalog: [], layout: FULL_LAYOUT })),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: DashboardWidgetsService, useValue: dashboardWidgetsServiceMock },
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal<AuthUser | null>({
              email: 'acastilla@bufete.com',
              firstName: 'Andrés',
              roles: [],
              permissions: [],
              isOwner: true,
            }),
          },
        },
      ],
    });

    const { component, fixture } = createComponent();

    expect(component.heroGreeting()).toBe('Hola Andrés, listo para tu jornada legal.');
    expect(fixture.nativeElement.textContent).toContain('Hola Andrés, listo para tu jornada legal.');
    expect(fixture.nativeElement.textContent).not.toContain('Acastilla');
  });

  // BUG-18: sin firstName (usuario legado), el saludo no inventa un
  // nombre desde el email — cae a una frase genérica sin nombre.
  it('sin firstName, el saludo del hero no expone el correo', () => {
    dashboardServiceMock = {
      getSummary: jest.fn().mockReturnValue(of(summary)),
      getOnboardingChecklist: jest.fn().mockReturnValue(of(null)),
    };
    deadlinesServiceMock = { getAll: jest.fn().mockReturnValue(of([])) };
    tasksServiceMock = { getAll: jest.fn().mockReturnValue(of([])) };
    dashboardWidgetsServiceMock = {
      getWidgets: jest.fn().mockReturnValue(of({ catalog: [], layout: FULL_LAYOUT })),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: DashboardWidgetsService, useValue: dashboardWidgetsServiceMock },
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        {
          provide: AuthService,
          useValue: {
            currentUser: signal<AuthUser | null>({
              email: 'info@bufete.com',
              roles: [],
              permissions: [],
              isOwner: true,
            }),
          },
        },
      ],
    });

    const { component, fixture } = createComponent();

    expect(component.heroGreeting()).toBe('Hola, listo para tu jornada legal.');
    expect(fixture.nativeElement.textContent).not.toContain('Info');
    expect(fixture.nativeElement.textContent).not.toContain('info@bufete.com');
  });

  it('si falla la carga del checklist, el dashboard sigue funcionando sin la card', () => {
    dashboardServiceMock = {
      getSummary: jest.fn().mockReturnValue(of(summary)),
      getOnboardingChecklist: jest.fn().mockReturnValue(throwError(() => new Error('fail'))),
    };
    deadlinesServiceMock = {
      getAll: jest.fn().mockReturnValue(of([])),
    };
    tasksServiceMock = {
      getAll: jest.fn().mockReturnValue(of([])),
    };
    dashboardWidgetsServiceMock = {
      getWidgets: jest.fn().mockReturnValue(of({ catalog: [], layout: FULL_LAYOUT })),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: DashboardWidgetsService, useValue: dashboardWidgetsServiceMock },
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        {
          provide: AuthService,
          useValue: { currentUser: signal<AuthUser | null>({ email: 'ana@bufete.com', roles: [], permissions: [], isOwner: true }) },
        },
      ],
    });

    const { component } = createComponent();

    expect(component.showChecklist()).toBe(false);
  });
});

// F32 PR2: el orden de los widgets se resuelve en runtime contra
// GET /dashboard/widgets — separado del describe de arriba porque no le
// interesa el checklist ni el saludo, solo `layout()` y su fallback.
describe('DashboardComponent — layout dinámico de widgets (F32 PR2)', () => {
  let dashboardServiceMock: { getSummary: jest.Mock; getOnboardingChecklist: jest.Mock };
  let dashboardWidgetsServiceMock: { getWidgets: jest.Mock };
  let deadlinesServiceMock: { getAll: jest.Mock };
  let tasksServiceMock: { getAll: jest.Mock };

  const summary: DashboardSummary = {
    totalProcesses: 0,
    processesByStatus: [],
    activeClients: 0,
    documentsThisMonth: 0,
    upcomingHearingsCount: 0,
    upcomingHearings: [],
    highRiskProcessesCount: 0,
    highRiskProcesses: [],
    recentDocuments: [],
    topAdvisors: [],
  };

  function configure(getWidgets: jest.Mock): void {
    dashboardServiceMock = {
      getSummary: jest.fn().mockReturnValue(of(summary)),
      getOnboardingChecklist: jest.fn().mockReturnValue(of(null)),
    };
    deadlinesServiceMock = { getAll: jest.fn().mockReturnValue(of([])) };
    tasksServiceMock = { getAll: jest.fn().mockReturnValue(of([])) };
    dashboardWidgetsServiceMock = { getWidgets };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: DashboardWidgetsService, useValue: dashboardWidgetsServiceMock },
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        {
          provide: AuthService,
          useValue: { currentUser: signal<AuthUser | null>({ email: 'ana@bufete.com', roles: [], permissions: [], isOwner: true }) },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('layout() refleja el orden devuelto por el backend, no el orden fijo anterior', () => {
    const reordered = ['top-advisors', 'stats', 'today-tasks'];
    configure(jest.fn().mockReturnValue(of({ catalog: [], layout: reordered })));

    const { component } = createComponent();

    expect(component.layout()).toEqual(reordered);
  });

  it('si GET /dashboard/widgets falla, cae al orden por defecto en vez de quedar vacío', () => {
    configure(jest.fn().mockReturnValue(throwError(() => new Error('fail'))));

    const { component } = createComponent();

    expect(component.layout()).toEqual(FULL_LAYOUT);
  });

  it('renderiza solo los widgets presentes en layout(), en ese orden', () => {
    configure(jest.fn().mockReturnValue(of({ catalog: [], layout: ['top-advisors', 'today-tasks'] })));

    const { fixture } = createComponent();
    const widgetTags = Array.from(
      fixture.nativeElement.querySelectorAll(
        'app-dashboard-stats-widget, app-dashboard-today-deadlines-widget, app-dashboard-today-tasks-widget, app-dashboard-high-risk-processes-widget, app-dashboard-upcoming-hearings-widget, app-dashboard-recent-documents-widget, app-dashboard-top-advisors-widget',
      ),
    ).map((el: Element) => el.tagName.toLowerCase());

    expect(widgetTags).toEqual(['app-dashboard-top-advisors-widget', 'app-dashboard-today-tasks-widget']);
  });
});

// F32 PR3: modo edición del tablero — agregar/quitar, subir/bajar, drag &
// drop (mismo mecanismo nativo HTML5 que F28 en
// settings-task-statuses.component.ts) y guardado explícito contra
// PUT /dashboard/widgets/layout.
describe('DashboardComponent — personalización con drag & drop (F32 PR3)', () => {
  let dashboardServiceMock: { getSummary: jest.Mock; getOnboardingChecklist: jest.Mock };
  let dashboardWidgetsServiceMock: { getWidgets: jest.Mock; saveLayout: jest.Mock };
  let deadlinesServiceMock: { getAll: jest.Mock };
  let tasksServiceMock: { getAll: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const summary: DashboardSummary = {
    totalProcesses: 0,
    processesByStatus: [],
    activeClients: 0,
    documentsThisMonth: 0,
    upcomingHearingsCount: 0,
    upcomingHearings: [],
    highRiskProcessesCount: 0,
    highRiskProcesses: [],
    recentDocuments: [],
    topAdvisors: [],
  };

  const catalog = [
    { key: 'stats', title: 'Indicadores clave', description: 'KPIs de procesos' },
    { key: 'today-tasks', title: 'Tareas de hoy', description: 'Trabajo pendiente' },
    { key: 'top-advisors', title: 'Asesores destacados', description: 'Calificación del equipo' },
  ];

  function configure(layout: string[]): void {
    dashboardServiceMock = {
      getSummary: jest.fn().mockReturnValue(of(summary)),
      getOnboardingChecklist: jest.fn().mockReturnValue(of(null)),
    };
    deadlinesServiceMock = { getAll: jest.fn().mockReturnValue(of([])) };
    tasksServiceMock = { getAll: jest.fn().mockReturnValue(of([])) };
    dashboardWidgetsServiceMock = {
      getWidgets: jest.fn().mockReturnValue(of({ catalog, layout })),
      saveLayout: jest.fn(),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: DashboardWidgetsService, useValue: dashboardWidgetsServiceMock },
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: AuthService,
          useValue: { currentUser: signal<AuthUser | null>({ email: 'ana@bufete.com', roles: [], permissions: [], isOwner: true }) },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('entrar en modo edición copia layout() a draftLayout sin tocar layout()', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();

    component.enterEditMode();

    expect(component.isEditingLayout()).toBe(true);
    expect(component.draftLayout()).toEqual(['stats', 'today-tasks']);
    expect(component.layout()).toEqual(['stats', 'today-tasks']);
  });

  it('cancelar sale del modo edición sin llamar al backend ni tocar layout() en vivo', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();
    component.enterEditMode();
    component.removeWidgetFromDraft('stats');

    component.cancelEditMode();

    expect(component.isEditingLayout()).toBe(false);
    expect(dashboardWidgetsServiceMock.saveLayout).not.toHaveBeenCalled();
    expect(component.layout()).toEqual(['stats', 'today-tasks']);
  });

  it('agregar un widget disponible lo suma al final del draft y lo saca de "disponibles"', () => {
    configure(['stats']);
    const { component } = createComponent();
    component.enterEditMode();

    expect(component.availableWidgets().map((w) => w.key)).toEqual(['today-tasks', 'top-advisors']);

    component.addWidgetToDraft('today-tasks');

    expect(component.draftLayout()).toEqual(['stats', 'today-tasks']);
    expect(component.availableWidgets().map((w) => w.key)).toEqual(['top-advisors']);
  });

  it('agregar un widget ya presente no lo duplica', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();
    component.enterEditMode();

    component.addWidgetToDraft('stats');

    expect(component.draftLayout()).toEqual(['stats', 'today-tasks']);
  });

  it('quitar un widget lo saca del draft y lo devuelve a "disponibles"', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();
    component.enterEditMode();

    component.removeWidgetFromDraft('stats');

    expect(component.draftLayout()).toEqual(['today-tasks']);
    expect(component.availableWidgets().map((w) => w.key)).toContain('stats');
  });

  it('moveDraftWidgetUp(0) no hace nada', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();
    component.enterEditMode();

    component.moveDraftWidgetUp(0);

    expect(component.draftLayout()).toEqual(['stats', 'today-tasks']);
  });

  it('moveDraftWidgetUp(1) intercambia con el anterior', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();
    component.enterEditMode();

    component.moveDraftWidgetUp(1);

    expect(component.draftLayout()).toEqual(['today-tasks', 'stats']);
  });

  it('moveDraftWidgetDown en el último elemento no hace nada', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();
    component.enterEditMode();

    component.moveDraftWidgetDown(1);

    expect(component.draftLayout()).toEqual(['stats', 'today-tasks']);
  });

  it('moveDraftWidgetDown(0) intercambia con el siguiente', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();
    component.enterEditMode();

    component.moveDraftWidgetDown(0);

    expect(component.draftLayout()).toEqual(['today-tasks', 'stats']);
  });

  it('drag & drop reordena el draft', () => {
    configure(['stats', 'today-tasks', 'top-advisors']);
    const { component } = createComponent();
    component.enterEditMode();

    component.onDraftDragStart({ dataTransfer: { setData: jest.fn() } } as unknown as DragEvent, 'top-advisors');
    component.onDraftDrop({ preventDefault: jest.fn() } as unknown as DragEvent, 0);

    expect(component.draftLayout()).toEqual(['top-advisors', 'stats', 'today-tasks']);
  });

  it('drop sin un drag previo no hace nada', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();
    component.enterEditMode();

    component.onDraftDrop({ preventDefault: jest.fn() } as unknown as DragEvent, 0);

    expect(component.draftLayout()).toEqual(['stats', 'today-tasks']);
  });

  it('guardar llama a saveLayout con el draft, actualiza layout() y sale del modo edición', () => {
    configure(['stats', 'today-tasks']);
    dashboardWidgetsServiceMock.saveLayout.mockReturnValue(of(['today-tasks', 'stats']));
    const { component } = createComponent();
    component.enterEditMode();
    component.moveDraftWidgetDown(0);

    component.saveLayoutEdits();

    expect(dashboardWidgetsServiceMock.saveLayout).toHaveBeenCalledWith(['today-tasks', 'stats']);
    expect(component.layout()).toEqual(['today-tasks', 'stats']);
    expect(component.isEditingLayout()).toBe(false);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Tablero personalizado guardado correctamente.');
  });

  it('si el backend rechaza el guardado, permanece en modo edición y avisa por toast', () => {
    configure(['stats', 'today-tasks']);
    dashboardWidgetsServiceMock.saveLayout.mockReturnValue(throwError(() => ({ message: 'No se pudo guardar' })));
    const { component } = createComponent();
    component.enterEditMode();

    component.saveLayoutEdits();

    expect(component.isEditingLayout()).toBe(true);
    expect(component.layout()).toEqual(['stats', 'today-tasks']);
    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo guardar');
  });

  it('widgetGridItemClasses da col-span-2 solo al widget de ancho completo (stats)', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();

    expect(component.widgetGridItemClasses('stats')).toBe('md:col-span-2');
    expect(component.widgetGridItemClasses('today-tasks')).toBe('');
  });

  it('widgetTitle/widgetDescription leen del catálogo cargado', () => {
    configure(['stats', 'today-tasks']);
    const { component } = createComponent();

    expect(component.widgetTitle('today-tasks')).toBe('Tareas de hoy');
    expect(component.widgetDescription('today-tasks')).toBe('Trabajo pendiente');
  });
});
