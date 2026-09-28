import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClientsService } from './clients.service';
import {
  ClientContactResponse,
  ClientMatterResponse,
  ClientMatterStatus,
  ClientPersonType,
  ClientResponse,
} from '../models/client-backend.model';
import { environment } from '../../../environments/environment';

import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/clients`;
  const contactsApiUrl = `${environment.apiUrl}/client-contacts`;
  const mattersApiUrl = `${environment.apiUrl}/client-matters`;

  // F33 (2026-09-14): ClientResponse ya no trae companyName/phone/email/
  // assignedAdvisor/updatedAt (email/phone/companyName se movieron a
  // ClientContact) — este fixture refleja el modelo actual.
  const client: ClientResponse = {
    id: 'client-1',
    fullName: 'Industria Midas S.A.',
    personType: ClientPersonType.JURIDICA,
    address: null,
    documentType: null,
    identificationNumber: '900123456',
    riskLevel: null,
    laftRisk: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const contact: ClientContactResponse = {
    id: 'contact-1',
    clientId: 'client-1',
    name: 'Ana Pérez',
    role: 'Representante legal',
    email: 'ana@midas.com',
    phone: '3009876543',
    mobile: null,
    isPrimary: true,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const matter: ClientMatterResponse = {
    id: 'matter-1',
    clientId: 'client-1',
    contractType: null,
    name: 'Asesoría permanente',
    description: null,
    startDate: null,
    endDate: null,
    status: ClientMatterStatus.VIGENTE,
    processCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    service.createClient({ fullName: 'Nuevo Cliente', identificationNumber: '111' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', client });

    expect(result).toEqual(client);
  });

  it('createClient en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.createClient({ fullName: 'X', identificationNumber: '1' }).subscribe({ error: (e) => (error = e) });

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

  // RBAC 2026-09-14: separado de updateClient — requiere clients.edit-compliance.
  it('updateClientCompliance hace PATCH a /compliance y extrae el cliente', () => {
    let result: ClientResponse | undefined;
    service
      .updateClientCompliance('client-1', { riskLevelId: 'r1', laftRiskId: 'l1' })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/client-1/compliance`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ riskLevelId: 'r1', laftRiskId: 'l1' });
    req.flush({ message: 'ok', client });

    expect(result).toEqual(client);
  });

  it('updateClientCompliance en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.updateClientCompliance('client-1', {}).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${apiUrl}/client-1/compliance`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  // F33 §2: contactos — estos 4 métodos y sus catch nunca habían tenido
  // tests (gap real detectado por la caída de coverage de branches del CI,
  // 2026-09-15).
  it('getContacts hace GET a /client-contacts filtrando por clientId', () => {
    let result: unknown;
    service.getContacts('client-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (request) => request.url === contactsApiUrl && request.params.get('clientId') === 'client-1',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', contacts: [contact] });

    expect(result).toEqual([contact]);
  });

  it('getContacts en error propaga el mensaje del backend', () => {
    // error.interceptor.ts fuerza el genérico en TODO 500 (ver buildErrorMessage) —
    // se usa 403 aquí, como en el resto de este archivo, para que el mensaje real
    // del backend sí se propague.
    let error: Error | undefined;
    service.getContacts('client-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(() => true).flush({ message: 'No se pudo cargar' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No se pudo cargar');
  });

  it('createContact hace POST y extrae el contacto creado', () => {
    let result: unknown;
    service
      .createContact({ clientId: 'client-1', name: 'Ana Pérez', isPrimary: true })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(contactsApiUrl);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', contact });

    expect(result).toEqual(contact);
  });

  it('createContact en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.createContact({ clientId: 'client-1', name: 'X' }).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(contactsApiUrl).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('updateContact hace PATCH a /client-contacts/:id y extrae el contacto actualizado', () => {
    let result: unknown;
    service.updateContact('contact-1', { name: 'Ana P. actualizada' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${contactsApiUrl}/contact-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Ana P. actualizada' });
    req.flush({ message: 'ok', contact });

    expect(result).toEqual(contact);
  });

  it('updateContact en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.updateContact('contact-1', {}).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${contactsApiUrl}/contact-1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('removeContact hace DELETE a /client-contacts/:id', () => {
    let completed = false;
    service.removeContact('contact-1').subscribe({ complete: () => (completed = true) });

    const req = httpMock.expectOne(`${contactsApiUrl}/contact-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(completed).toBe(true);
  });

  it('removeContact en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.removeContact('contact-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${contactsApiUrl}/contact-1`).flush({ message: 'No se pudo eliminar' }, { status: 409, statusText: 'Conflict' });

    expect(error?.message).toBe('No se pudo eliminar');
  });

  // F34 §2: asuntos (matters) — mismo patrón que contactos, sin tests hasta ahora.
  it('getMatters hace GET a /client-matters filtrando por clientId', () => {
    let result: unknown;
    service.getMatters('client-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      (request) => request.url === mattersApiUrl && request.params.get('clientId') === 'client-1',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', matters: [matter] });

    expect(result).toEqual([matter]);
  });

  it('getMatters en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.getMatters('client-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(() => true).flush({ message: 'No se pudo cargar' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No se pudo cargar');
  });

  it('createMatter hace POST y extrae el asunto creado', () => {
    let result: unknown;
    service.createMatter({ clientId: 'client-1', name: 'Asesoría permanente' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(mattersApiUrl);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok', matter });

    expect(result).toEqual(matter);
  });

  it('createMatter en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.createMatter({ clientId: 'client-1', name: 'X' }).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(mattersApiUrl).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('updateMatter hace PATCH a /client-matters/:id y extrae el asunto actualizado', () => {
    let result: unknown;
    service.updateMatter('matter-1', { name: 'Renombrado' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${mattersApiUrl}/matter-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Renombrado' });
    req.flush({ message: 'ok', matter });

    expect(result).toEqual(matter);
  });

  it('updateMatter con status TERMINADO envía el status en el body (cierre anticipado)', () => {
    let result: unknown;
    service
      .updateMatter('matter-1', { status: ClientMatterStatus.TERMINADO })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${mattersApiUrl}/matter-1`);
    expect(req.request.body).toEqual({ status: ClientMatterStatus.TERMINADO });
    req.flush({ message: 'ok', matter: { ...matter, status: ClientMatterStatus.TERMINADO } });

    expect((result as ClientMatterResponse).status).toBe(ClientMatterStatus.TERMINADO);
  });

  it('updateMatter en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.updateMatter('matter-1', {}).subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${mattersApiUrl}/matter-1`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });

  it('removeMatter hace DELETE a /client-matters/:id', () => {
    let completed = false;
    service.removeMatter('matter-1').subscribe({ complete: () => (completed = true) });

    const req = httpMock.expectOne(`${mattersApiUrl}/matter-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(completed).toBe(true);
  });

  it('removeMatter en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.removeMatter('matter-1').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(`${mattersApiUrl}/matter-1`).flush({ message: 'No se pudo eliminar' }, { status: 409, statusText: 'Conflict' });

    expect(error?.message).toBe('No se pudo eliminar');
  });
});
