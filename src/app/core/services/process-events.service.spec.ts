import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProcessEventsService } from './process-events.service';
import { ProcessEvent, ProcessEventType } from '../models/process-event.model';
import { environment } from '../../../environments/environment';

describe('ProcessEventsService', () => {
  let service: ProcessEventsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/legal-processes`;

  const event: ProcessEvent = {
    id: 'ev1',
    type: ProcessEventType.ANNOTATION,
    description: 'Nota de prueba',
    metadata: null,
    attachments: null,
    legalProcessId: 'p1',
    user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' },
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProcessEventsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('createAnnotation', () => {
    it('hace POST con la descripción y devuelve la anotación creada', () => {
      let result: ProcessEvent | undefined;
      service.createAnnotation('p1', 'Nota de prueba').subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/p1/annotations`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ description: 'Nota de prueba' });
      req.flush({ annotation: event });

      expect(result).toEqual(event);
    });
  });

  describe('getProcessHistory', () => {
    it('devuelve la lista de eventos del historial', () => {
      let result: ProcessEvent[] | undefined;
      service.getProcessHistory('p1').subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/p1/history`);
      expect(req.request.method).toBe('GET');
      req.flush({ events: [event], total: 1 });

      expect(result).toEqual([event]);
    });

    it('devuelve un arreglo vacío cuando el proceso no tiene eventos', () => {
      let result: ProcessEvent[] | undefined;
      service.getProcessHistory('p2').subscribe((r) => (result = r));

      httpMock.expectOne(`${apiUrl}/p2/history`).flush({ events: [], total: 0 });

      expect(result).toEqual([]);
    });
  });

  describe('setEventVisibility', () => {
    it('hace PATCH a /events/:id/visibility con visibleToClient', () => {
      let result: ProcessEvent | undefined;
      service.setEventVisibility('p1', 'ev1', true).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/p1/events/ev1/visibility`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ visibleToClient: true });
      req.flush({ event: { ...event, visibleToClient: true } });

      expect(result?.visibleToClient).toBe(true);
    });

    it('propaga visibleToClient en false', () => {
      let result: ProcessEvent | undefined;
      service.setEventVisibility('p1', 'ev1', false).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/p1/events/ev1/visibility`);
      expect(req.request.body).toEqual({ visibleToClient: false });
      req.flush({ event: { ...event, visibleToClient: false } });

      expect(result?.visibleToClient).toBe(false);
    });
  });
});
