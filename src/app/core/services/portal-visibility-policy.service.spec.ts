import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortalVisibilityPolicyService } from './portal-visibility-policy.service';
import {
  PortalEventVisibilityMode,
  PortalEventVisibilityPolicy,
} from '../models/portal-visibility-policy.model';
import { ProcessEventType } from '../models/process-event.model';
import { environment } from '../../../environments/environment';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('PortalVisibilityPolicyService', () => {
  let service: PortalVisibilityPolicyService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/portal-visibility-policy`;

  const policy: PortalEventVisibilityPolicy = {
    eventType: ProcessEventType.ANNOTATION,
    mode: PortalEventVisibilityMode.DEFAULT_OFF,
    allowsAlways: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: { isPlanGateError: () => false, promptUpgrade: () => {} } },
      ],
    });

    service = TestBed.inject(PortalVisibilityPolicyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAll hace GET a /portal-visibility-policy y extrae policies', () => {
    let result: PortalEventVisibilityPolicy[] | undefined;
    service.getAll().subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', policies: [policy] });

    expect(result).toEqual([policy]);
  });

  it('getAll en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getAll().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(apiUrl).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No autorizado');
  });

  it('update hace PATCH a /:eventType y extrae la política actualizada', () => {
    let result: PortalEventVisibilityPolicy | undefined;
    service.update(ProcessEventType.ANNOTATION, PortalEventVisibilityMode.DEFAULT_ON).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/ANNOTATION`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ mode: PortalEventVisibilityMode.DEFAULT_ON });
    req.flush({ message: 'ok', policy: { ...policy, mode: PortalEventVisibilityMode.DEFAULT_ON } });

    expect(result?.mode).toBe(PortalEventVisibilityMode.DEFAULT_ON);
  });

  it('update en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.update(ProcessEventType.ANNOTATION, PortalEventVisibilityMode.ALWAYS).subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${apiUrl}/ANNOTATION`)
      .flush({ message: 'ANNOTATION no admite modo ALWAYS' }, { status: 400, statusText: 'Bad Request' });

    expect(error?.message).toBe('ANNOTATION no admite modo ALWAYS');
  });
});
