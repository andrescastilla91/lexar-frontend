import { TestBed } from '@angular/core/testing';
import { DashboardRecentDocumentsWidgetComponent } from './dashboard-recent-documents-widget.component';
import { DashboardSummary } from '../../../core/models/dashboard.model';

describe('DashboardRecentDocumentsWidgetComponent (F32 PR1)', () => {
  const summary: DashboardSummary = {
    totalProcesses: 0,
    processesByStatus: [],
    activeClients: 0,
    documentsThisMonth: 2,
    upcomingHearingsCount: 0,
    upcomingHearings: [],
    highRiskProcessesCount: 0,
    highRiskProcesses: [],
    recentDocuments: [
      { id: 'doc1', filename: 'contrato.pdf', entityType: 'Proceso', uploadedBy: 'Ana Gómez', createdAt: new Date().toISOString() },
    ],
    topAdvisors: [],
  };

  function createComponent(value: DashboardSummary | null = summary, isLoading = false) {
    const fixture = TestBed.createComponent(DashboardRecentDocumentsWidgetComponent);
    fixture.componentRef.setInput('summary', value);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DashboardRecentDocumentsWidgetComponent] });
  });

  it('lista los documentos recientes', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('contrato.pdf');
    expect(fixture.nativeElement.textContent).toContain('Ana Gómez');
  });

  it('muestra el estado vacío cuando no hay documentos', () => {
    const empty: DashboardSummary = { ...summary, recentDocuments: [] };
    const { fixture } = createComponent(empty);

    expect(fixture.nativeElement.textContent).toContain('Aún no se han subido documentos.');
  });
});
