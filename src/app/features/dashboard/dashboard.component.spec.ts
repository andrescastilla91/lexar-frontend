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
