import { TestBed } from '@angular/core/testing';
import { DashboardUpcomingHearingsWidgetComponent } from './dashboard-upcoming-hearings-widget.component';
import { DashboardSummary } from '../../../core/models/dashboard.model';

describe('DashboardUpcomingHearingsWidgetComponent (F32 PR1)', () => {
  const summary: DashboardSummary = {
    totalProcesses: 1,
    processesByStatus: [],
    activeClients: 1,
    documentsThisMonth: 0,
    upcomingHearingsCount: 1,
    upcomingHearings: [
      {
        id: 'h1',
        title: 'Audiencia de conciliación',
        court: 'Juzgado 5',
        nextHearingDate: new Date().toISOString(),
        riskLevel: null,
        client: { id: 'c1', fullName: 'Cliente Uno' },
        advisors: [{ id: 'a1', firstName: 'Ana', lastName: 'Gómez' }],
      },
    ],
    highRiskProcessesCount: 0,
    highRiskProcesses: [],
    recentDocuments: [],
    topAdvisors: [],
  };

  function createComponent(value: DashboardSummary | null = summary, isLoading = false) {
    const fixture = TestBed.createComponent(DashboardUpcomingHearingsWidgetComponent);
    fixture.componentRef.setInput('summary', value);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DashboardUpcomingHearingsWidgetComponent] });
  });

  it('lista las próximas audiencias con las iniciales del primer asesor', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Audiencia de conciliación');
    expect(fixture.nativeElement.textContent).toContain('AG');
    expect(fixture.nativeElement.textContent).toContain('Cliente Uno');
  });

  it('advisorInitials devuelve "NA" cuando no hay asesores', () => {
    const { component } = createComponent();

    expect(component.advisorInitials([])).toBe('NA');
  });

  it('muestra "Cliente sin asignar" cuando la audiencia no tiene cliente', () => {
    const withoutClient: DashboardSummary = {
      ...summary,
      upcomingHearings: [{ ...summary.upcomingHearings[0], client: null }],
    };
    const { fixture } = createComponent(withoutClient);

    expect(fixture.nativeElement.textContent).toContain('Cliente sin asignar');
  });
});
