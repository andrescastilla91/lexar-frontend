import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SettingsCompanyDocumentsComponent } from './settings-company-documents.component';
import { CompanyDocumentsService } from '../../../core/services/company-documents.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { CompanyDocument } from '../../../core/models/company.model';

function makeDocument(overrides: Partial<CompanyDocument> = {}): CompanyDocument {
  return {
    documentType: 'RUT',
    fileId: 'file-1',
    originalFilename: 'rut.pdf',
    contentType: 'application/pdf',
    size: 100,
    issuedAt: null,
    expiresAt: null,
    isExpired: false,
    downloadUrl: 'https://dl.test/rut.pdf',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

describe('SettingsCompanyDocumentsComponent (F45)', () => {
  let service: { list: jest.Mock; upload: jest.Mock; remove: jest.Mock };
  let confirm: jest.Mock;
  let toast: { success: jest.Mock; error: jest.Mock };

  function create(documents: CompanyDocument[] = []) {
    service = {
      list: jest.fn().mockReturnValue(of(documents)),
      upload: jest.fn().mockReturnValue(of(makeDocument())),
      remove: jest.fn().mockReturnValue(of(undefined)),
    };
    confirm = jest.fn().mockResolvedValue(true);
    toast = { success: jest.fn(), error: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: CompanyDocumentsService, useValue: service },
        { provide: ConfirmDialogService, useValue: { confirm } },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(SettingsCompanyDocumentsComponent);
    fixture.detectChanges();
    return fixture;
  }

  const row = (fixture: { nativeElement: HTMLElement }, type: string) =>
    fixture.nativeElement.querySelector(`[data-document-type="${type}"]`) as HTMLElement;

  function pickFile(fixture: { nativeElement: HTMLElement }, type: string, name = 'doc.pdf') {
    const input = row(fixture, type).querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], name, { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    return file;
  }

  it('muestra los tres documentos y marca el RUT como requerido para contratar', () => {
    const fixture = create();

    expect(row(fixture, 'RUT').textContent).toContain('Requerido para contratar');
    expect(row(fixture, 'CHAMBER_OF_COMMERCE').textContent).not.toContain('Requerido para contratar');
    expect(row(fixture, 'LEGAL_REP_ID')).not.toBeNull();
    expect(row(fixture, 'RUT').textContent).toContain('Aún no has cargado este documento.');
  });

  it('un certificado de cámara de comercio vencido muestra la insignia y el aviso en la misma fila', () => {
    const fixture = create([
      makeDocument({
        documentType: 'CHAMBER_OF_COMMERCE',
        issuedAt: '2026-05-01',
        expiresAt: '2026-07-30',
        isExpired: true,
      }),
    ]);

    const chamber = row(fixture, 'CHAMBER_OF_COMMERCE');
    expect(chamber.querySelector('[data-test="expired-badge"]')).not.toBeNull();
    expect(chamber.querySelector('[data-test="expired-notice"]')?.textContent).toContain('no se bloquea ninguna operación');
    expect(row(fixture, 'RUT').querySelector('[data-test="expired-badge"]')).toBeNull();
  });

  it('un certificado vigente no muestra aviso', () => {
    const fixture = create([makeDocument({ documentType: 'CHAMBER_OF_COMMERCE', issuedAt: '2026-10-01' })]);

    expect(row(fixture, 'CHAMBER_OF_COMMERCE').querySelector('[data-test="expired-badge"]')).toBeNull();
  });

  it('la cámara de comercio no deja cargar el archivo sin fecha de expedición', () => {
    const fixture = create();

    const input = row(fixture, 'CHAMBER_OF_COMMERCE').querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);

    pickFile(fixture, 'CHAMBER_OF_COMMERCE');
    expect(service.upload).not.toHaveBeenCalled();
  });

  it('carga el RUT, avisa y notifica el cambio al contenedor', () => {
    const fixture = create();
    const changed = jest.fn();
    fixture.componentInstance.changed.subscribe(changed);

    const file = pickFile(fixture, 'RUT');

    expect(service.upload).toHaveBeenCalledWith('RUT', file, undefined);
    expect(toast.success).toHaveBeenCalled();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('la cámara de comercio sube con la fecha de expedición elegida', () => {
    const fixture = create();
    const date = row(fixture, 'CHAMBER_OF_COMMERCE').querySelector('[data-test="issue-date"]') as HTMLInputElement;
    date.value = '2026-09-15';
    date.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const file = pickFile(fixture, 'CHAMBER_OF_COMMERCE', 'camara.pdf');

    expect(service.upload).toHaveBeenCalledWith('CHAMBER_OF_COMMERCE', file, '2026-09-15');
  });

  it('si la carga falla muestra el error y no notifica cambio', () => {
    const fixture = create();
    service.upload.mockReturnValue(throwError(() => new Error('Tipo de archivo no permitido')));
    const changed = jest.fn();
    fixture.componentInstance.changed.subscribe(changed);

    pickFile(fixture, 'RUT');

    expect(toast.error).toHaveBeenCalledWith('Tipo de archivo no permitido');
    expect(changed).not.toHaveBeenCalled();
  });

  it('eliminar pide confirmación y, si se confirma, borra y notifica', async () => {
    const fixture = create([makeDocument()]);
    const changed = jest.fn();
    fixture.componentInstance.changed.subscribe(changed);

    const button = Array.from(row(fixture, 'RUT').querySelectorAll('button')).find((item) =>
      item.textContent?.includes('Eliminar'),
    )!;
    button.click();
    await fixture.whenStable();

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    expect(service.remove).toHaveBeenCalledWith('RUT');
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('si no se confirma, no borra nada', async () => {
    const fixture = create([makeDocument()]);
    confirm.mockResolvedValue(false);

    const button = Array.from(row(fixture, 'RUT').querySelectorAll('button')).find((item) =>
      item.textContent?.includes('Eliminar'),
    )!;
    button.click();
    await fixture.whenStable();

    expect(service.remove).not.toHaveBeenCalled();
  });

  it('muestra un error si no se pueden listar los documentos', () => {
    service = { list: jest.fn().mockReturnValue(throwError(() => new Error('x'))), upload: jest.fn(), remove: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: CompanyDocumentsService, useValue: service },
        { provide: ConfirmDialogService, useValue: { confirm: jest.fn() } },
        { provide: ToastService, useValue: { success: jest.fn(), error: jest.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(SettingsCompanyDocumentsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los documentos de la empresa.');
  });
});
