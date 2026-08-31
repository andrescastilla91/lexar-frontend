import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor, ApiError } from './error.interceptor';
import { PlanUpgradeService } from '../services/plan-upgrade.service';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let planUpgradeMock: { isPlanGateError: jest.Mock; promptUpgrade: jest.Mock };

  beforeEach(() => {
    // F7-R3: por defecto ningún error es un gate de plan — los tests que sí
    // lo necesitan sobreescriben isPlanGateError antes de disparar la request.
    planUpgradeMock = { isPlanGateError: jest.fn().mockReturnValue(false), promptUpgrade: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: planUpgradeMock },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function captureError(
    status: number,
    statusText: string,
    body: unknown,
  ): ApiError & { status?: number } {
    let error!: ApiError & { status?: number };

    http.get('/api/resource').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne('/api/resource').flush(body, { status, statusText });

    return error;
  }

  it('propaga 401 sin transformar, para que lo maneje el authInterceptor', () => {
    const error = captureError(401, 'Unauthorized', 'unauthorized');

    expect(error.status).toBe(401);
    expect(error.statusCode).toBeUndefined();
  });

  it('usa el mensaje del backend cuando el body trae message como string', () => {
    const error = captureError(409, 'Conflict', { message: 'El correo ya está registrado' });

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('El correo ya está registrado');
  });

  it('une los mensajes cuando el body trae message como arreglo', () => {
    const error = captureError(400, 'Bad Request', { message: ['El email es inválido', 'La contraseña es requerida'] });

    expect(error.message).toBe('El email es inválido, La contraseña es requerida');
  });

  it('usa el mensaje por defecto de cada código cuando el backend no envía detalle', () => {
    const notFound = captureError(404, 'Not Found', {});
    expect(notFound.message).toBe('Recurso no encontrado');

    const serverError = captureError(500, 'Server Error', {});
    expect(serverError.message).toBe('Error interno del servidor');

    const forbidden = captureError(403, 'Forbidden', {});
    expect(forbidden.message).toBe('No tienes permisos para realizar esta acción');
  });

  it('maneja errores de red del lado del cliente', () => {
    let error: ApiError | undefined;

    http.get('/api/resource').subscribe({ error: (e) => (error = e) });
    httpMock.expectOne('/api/resource').error(new ErrorEvent('error', { message: 'sin conexión' }));

    expect(error?.message).toBe('Error: sin conexión');
  });

  // F7-R3: un gate de plan dispara el toast+CTA de upgrade una sola vez,
  // centralizado aquí — y usa su mensaje real, nunca el 403 genérico.
  it('en un 403 FEATURE_NOT_IN_PLAN: dispara promptUpgrade y usa el mensaje real, no el genérico', () => {
    planUpgradeMock.isPlanGateError.mockReturnValue(true);
    const body = { code: 'FEATURE_NOT_IN_PLAN', message: 'Tu plan no incluye esta funcionalidad', feature: 'customCatalogs' };

    const error = captureError(403, 'Forbidden', body);

    expect(error.message).toBe('Tu plan no incluye esta funcionalidad');
    expect(planUpgradeMock.promptUpgrade).toHaveBeenCalledTimes(1);
    expect(planUpgradeMock.promptUpgrade.mock.calls[0][0].error).toEqual(body);
  });

  it('en un 400 LIMIT_REACHED: también dispara promptUpgrade', () => {
    planUpgradeMock.isPlanGateError.mockReturnValue(true);
    const body = { code: 'LIMIT_REACHED', message: 'Llegaste al límite de tu plan', limit: 'portalClientsMax' };

    const error = captureError(400, 'Bad Request', body);

    expect(error.message).toBe('Llegaste al límite de tu plan');
    expect(planUpgradeMock.promptUpgrade).toHaveBeenCalledTimes(1);
  });

  it('en un 403 normal (no gate de plan): NO dispara promptUpgrade', () => {
    captureError(403, 'Forbidden', {});

    expect(planUpgradeMock.promptUpgrade).not.toHaveBeenCalled();
  });
});
