import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LegalComplianceService } from './legal-compliance.service';
import { environment } from '../../../environments/environment';

describe('LegalComplianceService', () => {
  let service: LegalComplianceService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/legal-compliance`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LegalComplianceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('findAcceptances', () => {
    it('manda page/limit y solo los filtros con valor', () => {
      service
        .findAcceptances({ documentType: 'portal_terms', subjectKind: undefined, search: '' }, 2, 20)
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/acceptances` && r.params.get('page') === '2');
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.get('documentType')).toBe('portal_terms');
      expect(req.request.params.has('subjectKind')).toBe(false);
      expect(req.request.params.has('search')).toBe(false);
      req.flush({ message: 'ok', acceptances: [], total: 0, page: 2, limit: 20 });
    });
  });

  describe('exportAcceptances', () => {
    it('pide el CSV como blob solo con los filtros (sin page/limit)', () => {
      let result: Blob | undefined;
      service.exportAcceptances({ subjectKind: 'user' }).subscribe((blob) => {
        result = blob;
      });

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/acceptances/export`);
      expect(req.request.responseType).toBe('blob');
      expect(req.request.params.get('subjectKind')).toBe('user');
      expect(req.request.params.has('page')).toBe(false);
      expect(req.request.params.has('limit')).toBe(false);

      const blob = new Blob(['a,b'], { type: 'text/csv' });
      req.flush(blob);
      expect(result).toBe(blob);
    });

    it('si el backend responde 400, propaga el mensaje real', (done) => {
      service.exportAcceptances({}).subscribe({
        next: () => fail('no debería emitir valor'),
        error: (err: Error) => {
          expect(err.message).toContain('50000');
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/acceptances/export`);
      req.flush(new Blob([JSON.stringify({ message: 'Más del límite de 50000 registros.' })], { type: 'application/json' }), {
        status: 400,
        statusText: 'Bad Request',
      });
    });
  });

  describe('findClientAuthorizations', () => {
    it('manda page/limit y los filtros de estado y medio', () => {
      service.findClientAuthorizations({ status: 'pending', method: 'FISICA' }, 1, 20).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/client-authorizations`);
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('status')).toBe('pending');
      expect(req.request.params.get('method')).toBe('FISICA');
      req.flush({ message: 'ok', authorizations: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('exportClientAuthorizations', () => {
    it('pide el CSV como blob', () => {
      service.exportClientAuthorizations({ status: 'authorized' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/client-authorizations/export`);
      expect(req.request.responseType).toBe('blob');
      expect(req.request.params.get('status')).toBe('authorized');
      req.flush(new Blob(['x']));
    });

    it('si el backend responde 400, propaga el mensaje real', (done) => {
      service.exportClientAuthorizations({}).subscribe({
        next: () => fail('no debería emitir valor'),
        error: (err: Error) => {
          expect(err.message).toBe('Demasiados registros');
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/client-authorizations/export`);
      req.flush(new Blob([JSON.stringify({ message: 'Demasiados registros' })], { type: 'application/json' }), {
        status: 400,
        statusText: 'Bad Request',
      });
    });
  });
});
