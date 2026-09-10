import { TestBed } from '@angular/core/testing';
import { DashboardStatsWidgetComponent } from './dashboard-stats-widget.component';
import { DashboardSummary } from '../../../core/models/dashboard.model';
import { ProcessStatus } from '../../../core/models/legal-process.model';

describe('DashboardStatsWidgetComponent (F32 PR1)', () => {
  const summary: DashboardSummary = {
    totalProcesses: 12,
    processesByStatus: [{ status: ProcessStatus.ACTIVE, count: 8 }],
    activeClients: 5,
    documentsThisMonth: 3,
    upcomingHearingsCount: 2,
    upcomingHearings: [],
    highRiskProcessesCount: 1,
    highRiskProcesses: [],
    recentDocuments: [],
    topAdvisors: [],
  };

  function createComponent(isLoading = false, value: DashboardSummary | null = summary) {
    const fixture = TestBed.createComponent(DashboardStatsWidgetComponent);
    fixture.componentRef.setInput('summary', value);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DashboardStatsWidgetComponent] });
  });

  it('muestra el chip por estado y las 4 tarjetas de KPI cuando no está cargando', () => {
    const { fixture } = createComponent(false);

    expect(fixture.nativeElement.textContent).toContain('Activo');
    expect(fixture.nativeElement.textContent).toContain('Procesos totales');
    expect(fixture.nativeElement.textContent).toContain('Clientes activos');
    expect(fixture.nativeElement.textContent).toContain('Audiencias próximas');
    expect(fixture.nativeElement.textContent).toContain('Alertas de riesgo');
  });

  it('muestra los 4 esqueletos de carga cuando isLoading es true', () => {
    const { fixture } = createComponent(true);

    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(4);
    expect(fixture.nativeElement.textContent).not.toContain('Procesos totales');
  });

  it('no renderiza la fila de chips por estado si summary es null', () => {
    const { fixture } = createComponent(false, null);

    expect(fixture.nativeElement.textContent).not.toContain('Activo');
  });

  it('statCards queda vacío si summary es null', () => {
    const { component } = createComponent(false, null);

    expect(component.statCards()).toEqual([]);
  });
});
