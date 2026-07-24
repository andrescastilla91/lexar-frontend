import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { DashboardSummary, OnboardingChecklist } from '../models/dashboard.model';
import { environment } from '../../../environments/environment';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/dashboard`;

  const summary: DashboardSummary = {
    totalProcesses: 3,
    processesByStatus: [],
    activeClients: 2,
    documentsThisMonth: 1,
    upcomingHearingsCount: 0,
    upcomingHearings: [],
    highRiskProcessesCount: 0,
    highRiskProcesses: [],
    recentDocuments: [],
    topAdvisors: [],
  };

  const checklist: OnboardingChecklist = {
    emailVerified: false,
    companyProfileComplete: false,
    firstClientCreated: false,
    firstProcessCreated: false,
    firstDocumentUploaded: false,
    teamInvited: false,
    wizardCompleted: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getSummary extrae el resumen de la respuesta', () => {
    let result: DashboardSummary | undefined;
    service.getSummary().subscribe((s) => (result = s));

    const req = httpMock.expectOne(`${apiUrl}/summary`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', summary });

    expect(result).toEqual(summary);
  });

  it('getSummary en error lanza un mensaje legible', () => {
    let error: Error | undefined;
    service.getSummary().subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${apiUrl}/summary`)
      .flush({ message: 'Error al cargar el tablero' }, { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error al cargar el tablero');
  });

  it('getOnboardingChecklist extrae el checklist de la respuesta', () => {
    let result: OnboardingChecklist | undefined;
    service.getOnboardingChecklist().subscribe((c) => (result = c));

    const req = httpMock.expectOne(`${apiUrl}/onboarding-checklist`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', checklist });

    expect(result).toEqual(checklist);
  });
});
