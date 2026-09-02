import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClientsService } from './clients.service';
import { ClientResponse } from '../models/client-backend.model';
import { environment } from '../../../environments/environment';

import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/clients`;

  const client: ClientResponse = {
    id: 'client-1',
    fullName: 'Industria Midas S.A.',
    companyName: 'Industria Midas S.A.',
    phone: '3001234567',
    email: 'juridica@midas.com',
    address: null,
    documentType: null,
    identificationNumber: '900123456',
    riskLevel: null,
    isActive: true,
    assignedAdvisor: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: { isPlanGateError: () => false, promptUpgrade: () => {} } },
      ],
    });

    service = TestBed.inject(ClientsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getClients hace GET con página y límite', () => {
    let result: unknown;
    service.getClients(2, 5).subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (request) => request.url === apiUrl && request.params.get('page') === '2' && request.params.get('limit') === '5',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', clients: [client], total: 1, page: 2, limit: 5 });

    expect(result).toEqual({ message: 'ok', clients: [client], total: 1, page: 2, limit: 5 });
  });

  it('getClients en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getClients().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(() => true).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No autorizado');
  });

  it('getClients en error sin mensaje del backend usa el mensaje genérico', () => {
    let error: Error | undefined;
    service.getClients().subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(() => true).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('getClient hace GET a /clients/:id y extrae el cliente', () => {
    let result: ClientResponse | undefined;
    service.getClient('client-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/client-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', client });

    expect(result).toEqual(client);
  });

  it('getClient en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getClient('client-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/client-1`).flush({ message: 'No encontrado' }, { status: 404, statusText: 'Not Found' });

    expect(error?.message).toBe('No encontrado');
  });

  it('createClient hace POST y extrae el cliente creado', () => {
    let result: ClientResponse | undefined;
    service.createClient({ fullName: 'Nuevo Cliente', email: 'n@x.com', identificationNumber: '111' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', client });

    expect(result).toEqual(client);
  });

  it('createClient en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.createClient({ fullName: 'X', email: 'x@x.com', identificationNumber: '1' }).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(apiUrl).flush({ message: 'Documento duplicado' }, { status: 409, statusText: 'Conflict' });

    expect(error?.message).toBe('Documento duplicado');
  });

  it('updateClient hace PUT y extrae el cliente actualizado', () => {
    let result: ClientResponse | undefined;
    service.updateClient('client-1', { fullName: 'Actualizado' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/client-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ fullName: 'Actualizado' });
    req.flush({ message: 'ok', client });

    expect(result).toEqual(client);
  });

  it('updateClient en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.updateClient('client-1', {}).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/client-1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('toggleActive hace PATCH a /toggle-active y extrae el cliente', () => {
    let result: ClientResponse | undefined;
    service.toggleActive('client-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/client-1/toggle-active`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ message: 'ok', client: { ...client, isActive: false } });

    expect(result?.isActive).toBe(false);
  });

  it('toggleActive en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.toggleActive('client-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/client-1/toggle-active`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });
});
