import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardSummary, OnboardingChecklist } from '../../core/models/dashboard.model';
import { AuthUser } from '../../core/models/auth.model';

describe('DashboardComponent — checklist de primeros pasos (F10)', () => {
  let dashboardServiceMock: { getSummary: jest.Mock; getOnboardingChecklist: jest.Mock };

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

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        {
          provide: AuthService,
          useValue: { currentUser: signal<AuthUser | null>({ email: 'ana@bufete.com', roles: [], permissions: [] }) },
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

  it('si falla la carga del checklist, el dashboard sigue funcionando sin la card', () => {
    dashboardServiceMock = {
      getSummary: jest.fn().mockReturnValue(of(summary)),
      getOnboardingChecklist: jest.fn().mockReturnValue(throwError(() => new Error('fail'))),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        {
          provide: AuthService,
          useValue: { currentUser: signal<AuthUser | null>({ email: 'ana@bufete.com', roles: [], permissions: [] }) },
        },
      ],
    });

    const { component } = createComponent();

    expect(component.showChecklist()).toBe(false);
  });
});
