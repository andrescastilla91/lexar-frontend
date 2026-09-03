import { TestBed } from '@angular/core/testing';
import { DashboardTopAdvisorsWidgetComponent } from './dashboard-top-advisors-widget.component';
import { DashboardSummary } from '../../../core/models/dashboard.model';

describe('DashboardTopAdvisorsWidgetComponent (F32 PR1)', () => {
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
    topAdvisors: [{ id: 'a1', name: 'Ana Gómez', specialty: { id: 's1', label: 'Civil' } as never, rating: 4.5, experienceYears: 6 }],
  };

  function createComponent(value: DashboardSummary | null = summary, isLoading = false) {
    const fixture = TestBed.createComponent(DashboardTopAdvisorsWidgetComponent);
    fixture.componentRef.setInput('summary', value);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DashboardTopAdvisorsWidgetComponent] });
  });

  it('lista los asesores destacados', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Ana Gómez');
    expect(fixture.nativeElement.textContent).toContain('Civil');
    expect(fixture.nativeElement.textContent).toContain('6 años exp.');
  });

  it('muestra el estado vacío cuando no hay asesores activos', () => {
    const empty: DashboardSummary = { ...summary, topAdvisors: [] };
    const { fixture } = createComponent(empty);

    expect(fixture.nativeElement.textContent).toContain('No hay asesores activos registrados.');
  });
});
