import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { EntityFilesComponent } from './entity-files.component';
import { FilesService } from '../services/files.service';
import { CatalogsService } from '../services/catalogs.service';
import { ConfirmDialogService } from '../services/confirm-dialog.service';
import { ToastService } from '../services/toast.service';
import { PermissionsService } from '../services/permissions.service';
import { FileModel } from '../models/file.model';

function buildFile(overrides: Partial<FileModel> = {}): FileModel {
  return {
    id: 'f1',
    entityType: 'client',
    entityId: 'client-1',
    bucket: 'lexar-files',
    key: 'k1',
    originalFilename: 'contrato.pdf',
    contentType: 'application/pdf',
    size: 1024,
    formattedSize: '1 KB',
    metadata: null,
    uploadedBy: { id: 'u1', email: 'ana@lexar.com' },
    isPreviewable: true,
    isImage: false,
    isPdf: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildFileEvent(file: File): Event {
  const input = document.createElement('input');
  Object.defineProperty(input, 'files', { value: [file] });
  return { target: input } as unknown as Event;
}

describe('EntityFilesComponent (F37 §DOC-02)', () => {
  let filesServiceMock: {
    getFilesByEntity: jest.Mock;
    uploadFile: jest.Mock;
    previewFile: jest.Mock;
    downloadFile: jest.Mock;
    deleteFile: jest.Mock;
    setVisibility: jest.Mock;
    getFileIcon: jest.Mock;
  };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { error: jest.Mock };
  let permissionsServiceMock: {
    hasAnyPermission: jest.Mock;
    hasPermission: jest.Mock;
    userPermissions: ReturnType<typeof signal<string[]>>;
  };

  function configure(): void {
    // Algunos tests reconfiguran el TestBed varias veces en un mismo `it`
    // (para crear el componente con distintos entityType) — sin este
    // reset, la 2da llamada revienta con "Cannot configure the test module
    // when the test module has already been instantiated".
    TestBed.resetTestingModule();
    filesServiceMock = {
      getFilesByEntity: jest.fn().mockReturnValue(of([])),
      uploadFile: jest.fn(),
      previewFile: jest.fn(),
      downloadFile: jest.fn(),
      deleteFile: jest.fn(),
      setVisibility: jest.fn(),
      getFileIcon: jest.fn().mockReturnValue('M0 0'),
    };
    catalogsServiceMock = {
      getActiveCatalog: jest.fn().mockReturnValue(of([{ id: 'dt1', label: 'Contrato' }])),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastMock = { error: jest.fn() };
    // El template usa *hasPermission="['files.upload'|'files.delete']" —
    // sin este mock, HasPermissionDirective dispara NG0201 al inyectar
    // PermissionsService -> AuthService -> HttpClient.
    permissionsServiceMock = {
      hasAnyPermission: jest.fn().mockReturnValue(true),
      hasPermission: jest.fn().mockReturnValue(true),
      userPermissions: signal<string[]>(['files.upload', 'files.delete']),
    };

    TestBed.configureTestingModule({
      imports: [EntityFilesComponent],
      providers: [
        { provide: FilesService, useValue: filesServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
        { provide: PermissionsService, useValue: permissionsServiceMock },
      ],
    });
  }

  function createComponent(entityType = 'client', entityId = 'client-1') {
    const fixture = TestBed.createComponent(EntityFilesComponent);
    fixture.componentRef.setInput('entityType', entityType);
    fixture.componentRef.setInput('entityId', entityId);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('requiresDocumentType() es true para client y legal_process, false para el resto', () => {
    configure();
    const { component: clientComponent } = createComponent('client', 'client-1');
    expect(clientComponent.requiresDocumentType()).toBe(true);

    configure();
    const { component: processComponent } = createComponent('legal_process', 'process-1');
    expect(processComponent.requiresDocumentType()).toBe(true);

    configure();
    const { component: userComponent } = createComponent('user', 'user-1');
    expect(userComponent.requiresDocumentType()).toBe(false);
  });

  it('carga el catálogo case_document_type solo cuando la entidad lo requiere', () => {
    configure();
    createComponent('client', 'client-1');
    expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('case_document_type');

    configure();
    createComponent('user', 'user-1');
    expect(catalogsServiceMock.getActiveCatalog).not.toHaveBeenCalled();
  });

  it('al elegir un archivo, lo deja pendiente y no lo sube todavía', () => {
    configure();
    const { component } = createComponent();

    const file = new File(['x'], 'contrato.pdf', { type: 'application/pdf' });
    component.onFileSelected(buildFileEvent(file));

    expect(component.pendingFile()).toBe(file);
    expect(filesServiceMock.uploadFile).not.toHaveBeenCalled();
  });

  it('confirmPendingUpload no sube si falta el tipo de documento cuando es requerido', () => {
    configure();
    const { component } = createComponent('client', 'client-1');

    component.onFileSelected(buildFileEvent(new File(['x'], 'a.pdf')));
    component.confirmPendingUpload();

    expect(filesServiceMock.uploadFile).not.toHaveBeenCalled();
  });

  it('confirmPendingUpload sube el archivo con documentTypeId cuando se completa la selección', () => {
    configure();
    filesServiceMock.uploadFile.mockReturnValue(of(buildFile()));
    const { component } = createComponent('client', 'client-1');

    const file = new File(['x'], 'contrato.pdf', { type: 'application/pdf' });
    component.onFileSelected(buildFileEvent(file));
    component.onDocumentTypeChange({ target: { value: 'dt1' } } as unknown as Event);
    component.confirmPendingUpload();

    expect(filesServiceMock.uploadFile).toHaveBeenCalledWith(
      file,
      'client',
      'client-1',
      undefined,
      undefined,
      'dt1',
    );
    expect(component.pendingFile()).toBeNull();
  });

  it('confirmPendingUpload sube directo (sin documentTypeId) para entityType que no lo requiere', () => {
    configure();
    filesServiceMock.uploadFile.mockReturnValue(of(buildFile({ entityType: 'user' })));
    const { component } = createComponent('user', 'user-1');

    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    component.onFileSelected(buildFileEvent(file));
    component.confirmPendingUpload();

    expect(filesServiceMock.uploadFile).toHaveBeenCalledWith(
      file,
      'user',
      'user-1',
      undefined,
      undefined,
      undefined,
    );
  });

  it('confirmPendingUpload en error expone el mensaje real y no limpia el archivo pendiente', () => {
    configure();
    filesServiceMock.uploadFile.mockReturnValue(throwError(() => ({ message: 'Archivo inválido' })));
    const { component } = createComponent('client', 'client-1');

    component.onFileSelected(buildFileEvent(new File(['x'], 'a.pdf')));
    component.onDocumentTypeChange({ target: { value: 'dt1' } } as unknown as Event);
    component.confirmPendingUpload();

    expect(component.uploadError()).toBe('Archivo inválido');
    expect(toastMock.error).toHaveBeenCalledWith('Archivo inválido');
    expect(component.uploading()).toBe(false);
  });

  it('cancelPendingUpload limpia el archivo, el tipo elegido y el error', () => {
    configure();
    const { component } = createComponent('client', 'client-1');

    component.onFileSelected(buildFileEvent(new File(['x'], 'a.pdf')));
    component.onDocumentTypeChange({ target: { value: 'dt1' } } as unknown as Event);
    component.uploadError.set('algo falló');

    component.cancelPendingUpload();

    expect(component.pendingFile()).toBeNull();
    expect(component.pendingDocumentTypeId()).toBe('');
    expect(component.uploadError()).toBeNull();
  });

  it('deleteFile no elimina nada si el usuario cancela la confirmación', async () => {
    configure();
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.deleteFile(buildFile());

    expect(filesServiceMock.deleteFile).not.toHaveBeenCalled();
  });

  it('deleteFile elimina y recarga la lista cuando se confirma', async () => {
    configure();
    filesServiceMock.deleteFile.mockReturnValue(of(undefined));
    const { component } = createComponent();

    await component.deleteFile(buildFile());

    expect(filesServiceMock.deleteFile).toHaveBeenCalledWith('f1');
    expect(filesServiceMock.getFilesByEntity).toHaveBeenCalledTimes(2);
  });

  it('toggleVisibility actualiza el archivo localmente en éxito', () => {
    configure();
    filesServiceMock.getFilesByEntity.mockReturnValue(of([buildFile({ visibleToClient: false })]));
    filesServiceMock.setVisibility.mockReturnValue(of(buildFile({ visibleToClient: true })));
    const { component } = createComponent();

    component.toggleVisibility(component.files()[0]);

    expect(filesServiceMock.setVisibility).toHaveBeenCalledWith('f1', true);
    expect(component.files()[0].visibleToClient).toBe(true);
  });
});
