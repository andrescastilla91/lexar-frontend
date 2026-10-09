import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortalLegalDocumentsService } from './portal-legal-documents.service';
import { environment } from '../../../environments/environment';

describe('PortalLegalDocumentsService', () => {
  let service: PortalLegalDocumentsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/portal/legal-documents`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PortalLegalDocumentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getPendingAcceptance consulta GET /portal/legal-documents/pending-acceptance', () => {
    let result: unknown;
    service.getPendingAcceptance().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/pending-acceptance`);
    expect(req.request.method).toBe('GET');
    req.flush({ pending: null });

    expect(result).toEqual({ pending: null });
  });

  it('accept hace POST a /portal/legal-documents/:id/accept', () => {
    let result: unknown;
    service.accept('doc-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/doc-1/accept`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ message: 'Documento aceptado', acceptedAt: '2026-10-05T00:00:00.000Z' });

    expect(result).toEqual({ message: 'Documento aceptado', acceptedAt: '2026-10-05T00:00:00.000Z' });
  });
});
