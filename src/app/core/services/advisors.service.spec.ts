import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdvisorsService } from './advisors.service';
import { AdvisorResponse, AdvisorStatus } from '../models/advisor-backend.model';
import { environment } from '../../../environments/environment';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('AdvisorsService', () => {
  let service: AdvisorsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/advisors`;

  const advisor: AdvisorResponse = {
    id: 'adv-1',
    userId: 'user-1',
    specialty: { id: 'spec-1', code: 'civil', label: 'Civil', color: null },
    phone: '3001234567',
    status: AdvisorStatus.AVAILABLE,
    rating: 4.5,
    experienceYears: 5,
    isActive: true,
    companyId: 'company-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    // BUG-20 ola 1: se incluye errorInterceptor real en el pipeline — el
    // servicio, en producción, siempre recibe el error YA procesado por él
    // (provideHttpClient en app.config.ts registra errorInterceptor
    // globalmente). Probar el servicio sin el interceptor testeaba una forma
    // de error (HttpErrorResponse crudo) que nunca ocurre en la app real.
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: { isPlanGateError: () => false, promptUpgrade: () => {} } },
      ],
    });

    service = TestBed.inject(AdvisorsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getAdvisors hace GET con página y límite por defecto', () => {
    let result: unknown;
    service.getAdvisors().subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (request) => request.url === apiUrl && request.params.get('page') === '1' && request.params.get('limit') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', advisors: [advisor], total: 1, page: 1, limit: 10 });

    expect(result).toEqual({ message: 'ok', advisors: [advisor], total: 1, page: 1, limit: 10 });
  });

  it('getAdvisors agrega filtros de status, isActive y search a los params', () => {
    service.getAdvisors(2, 20, { status: AdvisorStatus.BUSY, isActive: false, search: 'laura' }).subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === apiUrl &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '20' &&
        request.params.get('status') === AdvisorStatus.BUSY &&
        request.params.get('isActive') === 'false' &&
        request.params.get('search') === 'laura',
    );
    req.flush({ message: 'ok', advisors: [], total: 0, page: 2, limit: 20 });
  });

  it('getAdvisors en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getAdvisors().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(() => true).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No autorizado');
  });

  // BUG-20: este test asumía que el fallback local del servicio
  // ('Error al cargar asesores') era lo que se mostraba cuando el body del
  // 500 no traía mensaje. Con errorInterceptor real en el pipeline (arriba),
  // .message para CUALQUIER 500 es siempre el genérico de BUG-19 — nunca
  // llega a estar vacío, así que el fallback local del servicio nunca se
  // dispara para un 500. El fallback sigue existiendo para el caso teórico
  // de un error sin pasar por el interceptor (por ejemplo, un fallo de red).
  it('getAdvisors en un 500 sin mensaje en el body, usa el genérico del interceptor (no el fallback local del servicio)', () => {
    let error: Error | undefined;
    service.getAdvisors().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(() => true).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  // BUG-20: aunque el 500 SÍ traiga un `message` en el body (p. ej. el
  // "Internal server error" en inglés que devuelve Nest por defecto ante una
  // excepción no controlada), el interceptor nunca confía en él — la
  // regla es "nunca" para 500, no solo "cuando el body viene vacío".
  it('getAdvisors en un 500 con message en el body, igual usa el genérico (nunca confía en el body de un 500)', () => {
    let error: Error | undefined;
    service.getAdvisors().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(() => true).flush({ message: 'Internal server error' }, { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('getAdvisor hace GET a /advisors/:id y extrae el asesor', () => {
    let result: AdvisorResponse | undefined;
    service.getAdvisor('adv-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/adv-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', advisor });

    expect(result).toEqual(advisor);
  });

  it('getAdvisor en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getAdvisor('adv-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/adv-1`).flush({ message: 'No encontrado' }, { status: 404, statusText: 'Not Found' });

    expect(error?.message).toBe('No encontrado');
  });

  it('createAdvisor hace POST y extrae el asesor creado', () => {
    let result: AdvisorResponse | undefined;
    service.createAdvisor({ userId: 'user-1' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: 'user-1' });
    req.flush({ message: 'ok', advisor });

    expect(result).toEqual(advisor);
  });

  it('createAdvisor en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.createAdvisor({ userId: 'user-1' }).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(apiUrl).flush({ message: 'Ya existe un asesor para ese usuario' }, { status: 409, statusText: 'Conflict' });

    expect(error?.message).toBe('Ya existe un asesor para ese usuario');
  });

  it('updateAdvisor hace PATCH y extrae el asesor actualizado', () => {
    let result: AdvisorResponse | undefined;
    service.updateAdvisor('adv-1', { phone: '3009999999' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/adv-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ phone: '3009999999' });
    req.flush({ message: 'ok', advisor });

    expect(result).toEqual(advisor);
  });

  // BUG-20: un 500 nunca confía en el body — error.interceptor.ts (BUG-19)
  // siempre usa su genérico en español ahí, sin importar el fallback local
  // del servicio (que solo aplicaría si error.message viniera vacío, y con
  // el interceptor real nunca lo está).
  it('updateAdvisor en un 500, usa el genérico del interceptor (nunca confía en el body)', () => {
    let error: Error | undefined;
    service.updateAdvisor('adv-1', {}).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/adv-1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('toggleActive hace PATCH a /toggle-active y extrae el asesor', () => {
    let result: AdvisorResponse | undefined;
    service.toggleActive('adv-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/adv-1/toggle-active`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ message: 'ok', advisor: { ...advisor, isActive: false } });

    expect(result?.isActive).toBe(false);
  });

  it('toggleActive en un 500, usa el genérico del interceptor (nunca confía en el body)', () => {
    let error: Error | undefined;
    service.toggleActive('adv-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/adv-1/toggle-active`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('deleteAdvisor hace DELETE y resuelve void', () => {
    let called = false;
    service.deleteAdvisor('adv-1').subscribe(() => (called = true));

    const req = httpMock.expectOne(`${apiUrl}/adv-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok' });

    expect(called).toBe(true);
  });

  it('deleteAdvisor en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.deleteAdvisor('adv-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/adv-1`).flush({ message: 'No se puede eliminar' }, { status: 400, statusText: 'Bad Request' });

    expect(error?.message).toBe('No se puede eliminar');
  });
});
