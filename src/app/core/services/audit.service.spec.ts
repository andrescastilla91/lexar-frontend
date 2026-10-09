import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditService } from './audit.service';
import { AuditLogListResponse } from '../models/audit-log.model';
import { environment } from '../../../environments/environment';

describe('AuditService', () => {
  let service: AuditService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/audit-logs`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('findAll', () => {
    it('manda page/limit y solo los filtros con valor', () => {
      service
        .findAll({ action: 'download', entityType: undefined, userId: '' }, 2, 20)
        .subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === apiUrl && r.params.get('page') === '2',
      );
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.get('action')).toBe('download');
      expect(req.request.params.has('entityType')).toBe(false);
      expect(req.request.params.has('userId')).toBe(false);

      const response: AuditLogListResponse = { logs: [], total: 0, page: 2, limit: 20 };
      req.flush(response);
    });
  });

  describe('exportCsv', () => {
    it('pide el CSV como blob con los filtros dados', () => {
      let result: Blob | undefined;
      service.exportCsv({ from: '2026-01-01T00:00:00.000Z' }).subscribe((blob) => {
        result = blob;
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${apiUrl}/export` && r.params.get('from') === '2026-01-01T00:00:00.000Z',
      );
      expect(req.request.responseType).toBe('blob');

      const blob = new Blob(['a,b\n1,2'], { type: 'text/csv' });
      req.flush(blob);

      expect(result).toBe(blob);
    });

    it('si el backend responde 400 (límite excedido), propaga el mensaje real en vez de un error genérico', (done) => {
      service.exportCsv({}).subscribe({
        next: () => fail('no debería emitir valor'),
        error: (err: Error) => {
          expect(err.message).toContain('50000');
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/export`);
      const errorBody = new Blob(
        [JSON.stringify({ message: 'El filtro actual arroja 60000 registros, más del límite de 50000.' })],
        { type: 'application/json' },
      );
      req.flush(errorBody, { status: 400, statusText: 'Bad Request' });
    });
  });
});
