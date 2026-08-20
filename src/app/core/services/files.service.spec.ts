import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FilesService } from './files.service';
import { FileModel, SignedUrlResponse } from '../models/file.model';
import { environment } from '../../../environments/environment';

/** Deja correr suficientes vueltas de microtask queue para que la cadena
 * fetch → switchMap → registerFile termine de propagarse antes de asertar. */
async function flushMicrotasks(rounds = 10): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

describe('FilesService', () => {
  let service: FilesService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/files`;

  const file: FileModel = {
    id: 'file-1',
    entityType: 'legal_process',
    entityId: 'process-1',
    bucket: 'bucket-1',
    key: 'key-1',
    originalFilename: 'contrato.pdf',
    contentType: 'application/pdf',
    size: 1024,
    formattedSize: '1 KB',
    metadata: null,
    uploadedBy: { id: 'user-1', email: 'user@lexar.com' },
    isPreviewable: true,
    isImage: false,
    isPdf: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FilesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
  });

  it('generateSignedUrl hace POST a /files/signed-url', () => {
    let result: SignedUrlResponse | undefined;
    service
      .generateSignedUrl({ filename: 'a.pdf', contentType: 'application/pdf', size: 100, entityType: 'client', entityId: 'c1' })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/signed-url`);
    expect(req.request.method).toBe('POST');
    const signed: SignedUrlResponse = { url: 'https://s3/upload', key: 'key-1', bucket: 'bucket-1', expiresIn: 900 };
    req.flush(signed);

    expect(result).toEqual(signed);
  });

  it('registerFile hace POST a /files', () => {
    let result: FileModel | undefined;
    service
      .registerFile({ key: 'key-1', bucket: 'bucket-1', originalFilename: 'a.pdf', contentType: 'application/pdf', size: 100, entityType: 'client', entityId: 'c1' })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush(file);

    expect(result).toEqual(file);
  });

  it('listFiles hace GET a /files con los params provistos', () => {
    service.listFiles({ entityType: 'client', entityId: 'c1', page: 2, limit: 5 }).subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === apiUrl &&
        request.params.get('entityType') === 'client' &&
        request.params.get('entityId') === 'c1' &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '5',
    );
    req.flush({ data: [file], total: 1, page: 2, limit: 5 });
  });

  it('listFiles sin params no agrega ningún query param', () => {
    service.listFiles().subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.params.keys().length).toBe(0);
    req.flush({ data: [], total: 0, page: 1, limit: 10 });
  });

  it('getFilesByEntity hace GET a /files/entity/:type/:id', () => {
    let result: FileModel[] | undefined;
    service.getFilesByEntity('client', 'c1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/entity/client/c1`);
    expect(req.request.method).toBe('GET');
    req.flush([file]);

    expect(result).toEqual([file]);
  });

  it('getFile hace GET a /files/:id', () => {
    let result: FileModel | undefined;
    service.getFile('file-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/file-1`);
    req.flush(file);

    expect(result).toEqual(file);
  });

  it('getDownloadUrl hace GET a /files/:id/download', () => {
    service.getDownloadUrl('file-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/file-1/download`);
    expect(req.request.method).toBe('GET');
    req.flush({ url: 'https://s3/download', filename: 'a.pdf', contentType: 'application/pdf', expiresIn: 300 });
  });

  it('deleteFile hace DELETE y notifica por fileDeleted$', () => {
    const notified: string[] = [];
    service.fileDeleted$.subscribe((id) => notified.push(id));

    service.deleteFile('file-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/file-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(notified).toEqual(['file-1']);
  });

  it('setVisibility hace PATCH a /files/:id/visibility con visibleToClient', () => {
    let result: FileModel | undefined;
    service.setVisibility('file-1', true).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/file-1/visibility`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ visibleToClient: true });
    req.flush({ file: { id: 'file-1', visibleToClient: true } });

    expect(result).toEqual({ id: 'file-1', visibleToClient: true });
  });

  it('previewFile resuelve la url firmada de descarga', () => {
    let result: string | undefined;
    service.previewFile('file-1').subscribe((r) => (result = r));

    httpMock.expectOne(`${apiUrl}/file-1/download`).flush({ url: 'https://s3/preview', filename: 'a.pdf', contentType: 'application/pdf', expiresIn: 300 });

    expect(result).toBe('https://s3/preview');
  });

  it('downloadFile crea un link temporal, simula el click y lo agrega/remueve del DOM', () => {
    jest.useFakeTimers();
    const clickSpy = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy);
    const appendSpy = jest.spyOn(document.body, 'appendChild');

    let completed = false;
    service.downloadFile('file-1').subscribe(() => (completed = true));

    httpMock
      .expectOne(`${apiUrl}/file-1/download`)
      .flush({ url: 'https://s3/download', filename: 'a.pdf', contentType: 'application/pdf', expiresIn: 300 });

    expect(completed).toBe(true);
    expect(appendSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    jest.useRealTimers();
    appendSpy.mockRestore();
  });

  it('uploadFile hace el flujo completo: signed-url, PUT a S3 y registro', async () => {
    const testFile = new File(['contenido'], 'contrato.pdf', { type: 'application/pdf' });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, statusText: 'OK' });
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;

    let result: FileModel | undefined;
    service.uploadFile(testFile, 'legal_process', 'process-1').subscribe((r) => (result = r));

    const signedReq = httpMock.expectOne(`${apiUrl}/signed-url`);
    expect(signedReq.request.body).toEqual(
      expect.objectContaining({ filename: 'contrato.pdf', contentType: 'application/pdf', entityType: 'legal_process', entityId: 'process-1' }),
    );
    signedReq.flush({ url: 'https://s3/upload', key: 'key-1', bucket: 'bucket-1', expiresIn: 900 });

    await flushMicrotasks();

    expect(fetchMock).toHaveBeenCalledWith('https://s3/upload', expect.objectContaining({ method: 'PUT' }));

    const registerReq = httpMock.expectOne(apiUrl);
    expect(registerReq.request.method).toBe('POST');
    expect(registerReq.request.body).toEqual(
      expect.objectContaining({ key: 'key-1', bucket: 'bucket-1', originalFilename: 'contrato.pdf' }),
    );
    registerReq.flush(file);

    expect(result).toEqual(file);
  });

  it('uploadFile propaga el error cuando la subida a S3 falla', async () => {
    const testFile = new File(['contenido'], 'contrato.pdf', { type: 'application/pdf' });
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, statusText: 'Forbidden' });
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;

    let error: Error | undefined;
    service.uploadFile(testFile, 'legal_process', 'process-1').subscribe({ error: (e) => (error = e) });

    const signedReq = httpMock.expectOne(`${apiUrl}/signed-url`);
    signedReq.flush({ url: 'https://s3/upload', key: 'key-1', bucket: 'bucket-1', expiresIn: 900 });

    await flushMicrotasks();

    expect(error?.message).toBe('Upload failed: Forbidden');
  });

  it('getFileExtension retorna la extensión en minúsculas', () => {
    expect(service.getFileExtension('Contrato.PDF')).toBe('pdf');
  });

  it('getFileExtension retorna vacío cuando no hay extensión', () => {
    expect(service.getFileExtension('sinextension')).toBe('');
  });

  it('getFileIcon retorna un ícono distinto según el contentType', () => {
    const image = service.getFileIcon('image/png');
    const pdf = service.getFileIcon('application/pdf');
    const video = service.getFileIcon('video/mp4');
    const audio = service.getFileIcon('audio/mpeg');
    const spreadsheet = service.getFileIcon('application/vnd.ms-excel');
    const zip = service.getFileIcon('application/zip');
    const other = service.getFileIcon('application/octet-stream');

    expect(image).not.toBe(pdf);
    expect(video).not.toBe(audio);
    expect(spreadsheet).not.toBe(zip);
    expect(other).toBeTruthy();
  });

  it('formatFileSize formatea 0 bytes', () => {
    expect(service.formatFileSize(0)).toBe('0 B');
  });

  it('formatFileSize formatea kilobytes y megabytes', () => {
    expect(service.formatFileSize(1024)).toBe('1 KB');
    expect(service.formatFileSize(1048576)).toBe('1 MB');
  });
});
