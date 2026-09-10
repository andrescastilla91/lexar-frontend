import { TestBed } from '@angular/core/testing';
import { DashboardHighRiskProcessesWidgetComponent } from './dashboard-high-risk-processes-widget.component';
import { DashboardSummary } from '../../../core/models/dashboard.model';

describe('DashboardHighRiskProcessesWidgetComponent (F32 PR1)', () => {
  const summary: DashboardSummary = {
    totalProcesses: 1,
    processesByStatus: [],
    activeClients: 1,
    documentsThisMonth: 0,
    upcomingHearingsCount: 0,
    upcomingHearings: [],
    highRiskProcessesCount: 1,
    highRiskProcesses: [
      { id: 'p1', title: 'Proceso riesgoso', court: 'Juzgado 3', nextHearingDate: null, riskLevel: { id: 'r1', label: 'Alto' } as never, client: null },
    ],
    recentDocuments: [],
    topAdvisors: [],
  };

  function createComponent(value: DashboardSummary | null = summary, isLoading = false) {
    const fixture = TestBed.createComponent(DashboardHighRiskProcessesWidgetComponent);
    fixture.componentRef.setInput('summary', value);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DashboardHighRiskProcessesWidgetComponent] });
  });

  it('lista los procesos de riesgo alto', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Proceso riesgoso');
    expect(fixture.nativeElement.textContent).toContain('Juzgado 3');
  });

  it('muestra el estado vacío cuando no hay procesos de riesgo', () => {
    const empty: DashboardSummary = { ...summary, highRiskProcesses: [] };
    const { fixture } = createComponent(empty);

    expect(fixture.nativeElement.textContent).toContain('No hay procesos de riesgo alto en este momento.');
  });
});
