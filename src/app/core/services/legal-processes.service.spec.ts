import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LegalProcessesService } from './legal-processes.service';
import { LegalProcessResponse, ProcessStatus } from '../models/legal-process.model';
import { environment } from '../../../environments/environment';

describe('LegalProcessesService', () => {
  let service: LegalProcessesService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/legal-processes`;

  const process: LegalProcessResponse = {
    id: 'p1',
    title: 'Proceso de prueba',
    description: null,
    status: ProcessStatus.DRAFT,
    stage: null,
    riskLevel: null,
    court: null,
    caseNumber: null,
    nextHearingDate: null,
    startDate: null,
    endDate: null,
    companyId: 'c1',
    clientId: 'cl1',
    client: { id: 'cl1', fullName: 'Cliente Uno', email: 'cliente@lexar.com' },
    advisors: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(LegalProcessesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getLegalProcesses', () => {
    it('envía page y limit por defecto sin filtros', () => {
      service.getLegalProcesses().subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === apiUrl && r.params.get('page') === '1' && r.params.get('limit') === '10',
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.has('status')).toBe(false);
      req.flush({ message: 'ok', legalProcesses: [process], total: 1, page: 1, limit: 10 });
    });

    it('envía los filtros presentes como query params', () => {
      service
        .getLegalProcesses(2, 20, {
          status: ProcessStatus.ACTIVE,
          clientId: 'cl1',
          advisorId: 'adv1',
          search: 'demanda',
        })
        .subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.url === apiUrl &&
          r.params.get('page') === '2' &&
          r.params.get('limit') === '20' &&
          r.params.get('status') === 'ACTIVE' &&
          r.params.get('clientId') === 'cl1' &&
          r.params.get('advisorId') === 'adv1' &&
          r.params.get('search') === 'demanda',
      );
      req.flush({ message: 'ok', legalProcesses: [], total: 0, page: 2, limit: 20 });
    });

    it('en error expone el mensaje del backend', () => {
      let error: Error | undefined;
      service.getLegalProcesses().subscribe({ error: (e) => (error = e) });

      httpMock
        .expectOne((r) => r.url === apiUrl)
        .flush({ message: 'Sin permiso' }, { status: 403, statusText: 'Forbidden' });

      expect(error?.message).toBe('Sin permiso');
    });

    it('en error sin mensaje del backend usa el mensaje genérico', () => {
      let error: Error | undefined;
      service.getLegalProcesses().subscribe({ error: (e) => (error = e) });

      httpMock.expectOne((r) => r.url === apiUrl).flush('error', { status: 500, statusText: 'Server Error' });

      expect(error?.message).toBe('Error al cargar procesos legales');
    });
  });

  describe('getLegalProcess', () => {
    it('devuelve el proceso desenvolviendo la respuesta', () => {
      let result: LegalProcessResponse | undefined;
      service.getLegalProcess('p1').subscribe((r) => (result = r));

      httpMock.expectOne(`${apiUrl}/p1`).flush({ message: 'ok', legalProcess: process });

      expect(result).toEqual(process);
    });

    it('en error usa el mensaje genérico si el backend no envía uno', () => {
      let error: Error | undefined;
      service.getLegalProcess('p1').subscribe({ error: (e) => (error = e) });

      httpMock.expectOne(`${apiUrl}/p1`).flush('error', { status: 404, statusText: 'Not Found' });

      expect(error?.message).toBe('Error al cargar proceso legal');
    });
  });

  describe('createLegalProcess', () => {
    it('hace POST y devuelve el proceso creado', () => {
      let result: LegalProcessResponse | undefined;
      service
        .createLegalProcess({ title: 'Nuevo', clientId: 'cl1', status: ProcessStatus.DRAFT })
        .subscribe((r) => (result = r));

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ title: 'Nuevo', clientId: 'cl1', status: ProcessStatus.DRAFT });
      req.flush({ message: 'ok', legalProcess: process });

      expect(result).toEqual(process);
    });

    it('en error expone el mensaje del backend', () => {
      let error: Error | undefined;
      service.createLegalProcess({ title: 'Nuevo', clientId: 'cl1' }).subscribe({ error: (e) => (error = e) });

      httpMock.expectOne(apiUrl).flush({ message: 'Cliente inválido' }, { status: 400, statusText: 'Bad Request' });

      expect(error?.message).toBe('Cliente inválido');
    });
  });

  describe('updateLegalProcess', () => {
    it('hace PUT y devuelve el proceso actualizado', () => {
      let result: LegalProcessResponse | undefined;
      service.updateLegalProcess('p1', { title: 'Editado' }).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/p1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ title: 'Editado' });
      req.flush({ message: 'ok', legalProcess: { ...process, title: 'Editado' } });

      expect(result?.title).toBe('Editado');
    });

    it('en error sin mensaje del backend usa el mensaje genérico', () => {
      let error: Error | undefined;
      service.updateLegalProcess('p1', { title: 'x' }).subscribe({ error: (e) => (error = e) });

      httpMock.expectOne(`${apiUrl}/p1`).flush('error', { status: 500, statusText: 'Server Error' });

      expect(error?.message).toBe('Error al actualizar proceso legal');
    });
  });

  describe('updateProcessStatus', () => {
    it('hace PATCH a /status y devuelve el proceso con el nuevo estado', () => {
      let result: LegalProcessResponse | undefined;
      service
        .updateProcessStatus('p1', { status: ProcessStatus.ACTIVE, notes: 'listo' })
        .subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/p1/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: ProcessStatus.ACTIVE, notes: 'listo' });
      req.flush({ message: 'ok', legalProcess: { ...process, status: ProcessStatus.ACTIVE } });

      expect(result?.status).toBe(ProcessStatus.ACTIVE);
    });

    it('en error expone el mensaje del backend', () => {
      let error: Error | undefined;
      service.updateProcessStatus('p1', { status: ProcessStatus.CANCELLED }).subscribe({ error: (e) => (error = e) });

      httpMock
        .expectOne(`${apiUrl}/p1/status`)
        .flush({ message: 'Transición inválida' }, { status: 400, statusText: 'Bad Request' });

      expect(error?.message).toBe('Transición inválida');
    });
  });

  describe('deleteLegalProcess', () => {
    it('hace DELETE al proceso', () => {
      let completed = false;
      service.deleteLegalProcess('p1').subscribe(() => (completed = true));

      const req = httpMock.expectOne(`${apiUrl}/p1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(completed).toBe(true);
    });

    it('en error sin mensaje del backend usa el mensaje genérico', () => {
      let error: Error | undefined;
      service.deleteLegalProcess('p1').subscribe({ error: (e) => (error = e) });

      httpMock.expectOne(`${apiUrl}/p1`).flush('error', { status: 500, statusText: 'Server Error' });

      expect(error?.message).toBe('Error al eliminar proceso legal');
    });
  });
});
