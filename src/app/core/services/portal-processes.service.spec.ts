import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortalProcessesService } from './portal-processes.service';
import {
  PortalDocumentItem,
  PortalDownloadUrlResponse,
  PortalProcessListItem,
  PortalTimelineItem,
} from '../models/portal.model';
import { environment } from '../../../environments/environment';

describe('PortalProcessesService', () => {
  let service: PortalProcessesService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/portal`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PortalProcessesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('findProcesses', () => {
    it('devuelve la lista de procesos desapoyando la respuesta', () => {
      const processes: PortalProcessListItem[] = [
        {
          id: 'p1',
          title: 'Proceso',
          status: 'ACTIVE',
          statusLabel: 'Activo',
          stage: 'Demanda',
          court: 'Juzgado 1',
          caseNumber: 'PROC-1',
          nextHearingDate: null,
          advisors: [{ name: 'Ana G' }],
          createdAt: '2026-01-01',
        },
      ];
      let result: PortalProcessListItem[] | undefined;

      service.findProcesses().subscribe((r) => (result = r));

      httpMock.expectOne(`${apiUrl}/processes`).flush({ processes });

      expect(result).toEqual(processes);
    });

    it('en error expone el mensaje del backend', () => {
      let error: Error | undefined;

      service.findProcesses().subscribe({ error: (e) => (error = e) });

      httpMock
        .expectOne(`${apiUrl}/processes`)
        .flush({ message: 'Sin permiso' }, { status: 403, statusText: 'Forbidden' });

      expect(error?.message).toBe('Sin permiso');
    });

    it('en error sin mensaje del backend usa el mensaje genérico', () => {
      let error: Error | undefined;

      service.findProcesses().subscribe({ error: (e) => (error = e) });

      httpMock.expectOne(`${apiUrl}/processes`).flush('error', { status: 500, statusText: 'Server Error' });

      expect(error?.message).toBe('No se pudieron cargar tus procesos');
    });
  });

  describe('findTimeline', () => {
    it('devuelve la línea de tiempo del proceso', () => {
      const timeline: PortalTimelineItem[] = [
        { id: 'ev1', type: 'STATUS_CHANGE', description: 'x', createdAt: '2026-01-01' },
      ];
      let result: PortalTimelineItem[] | undefined;

      service.findTimeline('p1').subscribe((r) => (result = r));

      httpMock.expectOne(`${apiUrl}/processes/p1/timeline`).flush({ timeline });

      expect(result).toEqual(timeline);
    });

    it('en error expone el mensaje genérico', () => {
      let error: Error | undefined;

      service.findTimeline('p1').subscribe({ error: (e) => (error = e) });

      httpMock
        .expectOne(`${apiUrl}/processes/p1/timeline`)
        .flush('error', { status: 500, statusText: 'Server Error' });

      expect(error?.message).toBe('No se pudo cargar la línea de tiempo');
    });
  });

  describe('findDocuments', () => {
    it('devuelve los documentos del proceso', () => {
      const documents: PortalDocumentItem[] = [
        {
          id: 'f1',
          originalFilename: 'doc.pdf',
          contentType: 'application/pdf',
          formattedSize: '1.2 MB',
          createdAt: '2026-01-01',
        },
      ];
      let result: PortalDocumentItem[] | undefined;

      service.findDocuments('p1').subscribe((r) => (result = r));

      httpMock.expectOne(`${apiUrl}/processes/p1/documents`).flush({ documents });

      expect(result).toEqual(documents);
    });

    it('en error expone el mensaje genérico', () => {
      let error: Error | undefined;

      service.findDocuments('p1').subscribe({ error: (e) => (error = e) });

      httpMock
        .expectOne(`${apiUrl}/processes/p1/documents`)
        .flush('error', { status: 500, statusText: 'Server Error' });

      expect(error?.message).toBe('No se pudieron cargar los documentos');
    });
  });

  describe('getDownloadUrl', () => {
    it('devuelve la url de descarga firmada', () => {
      const response: PortalDownloadUrlResponse = {
        url: 'https://s3/x',
        filename: 'doc.pdf',
        contentType: 'application/pdf',
        expiresIn: 300,
      };
      let result: PortalDownloadUrlResponse | undefined;

      service.getDownloadUrl('p1', 'f1').subscribe((r) => (result = r));

      httpMock.expectOne(`${apiUrl}/processes/p1/documents/f1/download`).flush(response);

      expect(result).toEqual(response);
    });

    it('en error expone el mensaje genérico', () => {
      let error: Error | undefined;

      service.getDownloadUrl('p1', 'f1').subscribe({ error: (e) => (error = e) });

      httpMock
        .expectOne(`${apiUrl}/processes/p1/documents/f1/download`)
        .flush('error', { status: 500, statusText: 'Server Error' });

      expect(error?.message).toBe('No se pudo generar el enlace de descarga');
    });
  });
});
