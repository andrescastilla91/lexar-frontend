import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor, ApiError } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
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
});
