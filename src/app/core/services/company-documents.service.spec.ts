import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CompanyDocumentsService } from './company-documents.service';
import { environment } from '../../../environments/environment';

describe('CompanyDocumentsService (F45)', () => {
  let service: CompanyDocumentsService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/company/documents`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CompanyDocumentsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    jest.restoreAllMocks();
  });

  it('list() devuelve los documentos del tenant', () => {
    let result: unknown;
    service.list().subscribe((documents) => (result = documents));

    http.expectOne(url).flush({ documents: [{ documentType: 'RUT' }] });

    expect(result).toEqual([{ documentType: 'RUT' }]);
  });

  it('remove() borra por tipo de documento', () => {
    let done = false;
    service.remove('CHAMBER_OF_COMMERCE').subscribe(() => (done = true));

    const req = http.expectOne(`${url}/CHAMBER_OF_COMMERCE`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok' });

    expect(done).toBe(true);
  });

  it('upload() pide la URL firmada, sube el archivo y registra el documento con la fecha de expedición', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, statusText: 'OK' });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    const file = new File(['x'], 'camara.pdf', { type: 'application/pdf' });

    let result: unknown;
    service.upload('CHAMBER_OF_COMMERCE', file, '2026-09-01').subscribe((document) => (result = document));

    const signedReq = http.expectOne(`${url}/signed-url`);
    expect(signedReq.request.body).toEqual({ filename: 'camara.pdf', contentType: 'application/pdf', size: 1 });
    signedReq.flush({ url: 'https://s3.test/put', key: 'k', bucket: 'b', expiresIn: 3600 });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const registerReq = http.expectOne(url);
    expect(registerReq.request.body).toMatchObject({
      documentType: 'CHAMBER_OF_COMMERCE',
      key: 'k',
      bucket: 'b',
      issuedAt: '2026-09-01',
    });
    registerReq.flush({ document: { documentType: 'CHAMBER_OF_COMMERCE' } });

    expect(fetchMock).toHaveBeenCalledWith('https://s3.test/put', expect.objectContaining({ method: 'PUT' }));
    expect(result).toEqual({ documentType: 'CHAMBER_OF_COMMERCE' });
  });

  it('upload() no incluye issuedAt cuando no se indica', async () => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, statusText: 'OK' }) as unknown as typeof fetch;
    const file = new File(['x'], 'rut.pdf', { type: 'application/pdf' });

    service.upload('RUT', file).subscribe();
    http.expectOne(`${url}/signed-url`).flush({ url: 'u', key: 'k', bucket: 'b', expiresIn: 1 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const registerReq = http.expectOne(url);
    expect('issuedAt' in (registerReq.request.body as object)).toBe(false);
    registerReq.flush({ document: {} });
  });
});
