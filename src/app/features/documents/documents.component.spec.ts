import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { DocumentsComponent } from './documents.component';
import { FilesService } from '../../core/services/files.service';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ClientsService } from '../../core/services/clients.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { FileModel } from '../../core/models/file.model';

function buildFile(overrides: Partial<FileModel> = {}): FileModel {
  return {
    id: 'f1',
    entityType: 'legal_process',
    entityId: 'p1',
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

describe('DocumentsComponent', () => {
  let filesServiceMock: {
    listFiles: jest.Mock;
    uploadFile: jest.Mock;
    previewFile: jest.Mock;
    downloadFile: jest.Mock;
    deleteFile: jest.Mock;
    formatFileSize: jest.Mock;
    getFileIcon: jest.Mock;
  };
  let processesServiceMock: { getLegalProcesses: jest.Mock };
  let clientsServiceMock: { getClients: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let alertSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  function configure(): void {
    filesServiceMock = {
      listFiles: jest.fn().mockReturnValue(of({ data: [buildFile()], total: 1, page: 1, limit: 10 })),
      uploadFile: jest.fn(),
      previewFile: jest.fn(),
      downloadFile: jest.fn(),
      deleteFile: jest.fn(),
      formatFileSize: jest.fn().mockReturnValue('1 KB'),
      getFileIcon: jest.fn().mockReturnValue('M0 0'),
    };
    processesServiceMock = {
      getLegalProcesses: jest.fn().mockReturnValue(
        of({ message: '', legalProcesses: [{ id: 'p1', title: 'Proceso 1' }], total: 1, page: 1, limit: 100 }),
      ),
    };
    clientsServiceMock = {
      getClients: jest.fn().mockReturnValue(
        of({ message: '', clients: [{ id: 'c1', fullName: 'Cliente 1' }], total: 1, page: 1, limit: 100 }),
      ),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [DocumentsComponent],
      providers: [
        { provide: FilesService, useValue: filesServiceMock },
        { provide: LegalProcessesService, useValue: processesServiceMock },
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal(['files.upload', 'files.view', 'files.delete']),
          },
        },
      ],
    });

    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  }

  function createComponent() {
    const fixture = TestBed.createComponent(DocumentsComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  afterEach(() => {
    alertSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  it('al iniciar carga procesos, clientes y archivos', () => {
    configure();
    const { component } = createComponent();

    expect(processesServiceMock.getLegalProcesses).toHaveBeenCalledWith(1, 100);
    expect(clientsServiceMock.getClients).toHaveBeenCalledWith(1, 100);
    expect(filesServiceMock.listFiles).toHaveBeenCalledWith({});
    expect(component.files().length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('documentRows enriquece cada archivo con ícono, nombre de entidad y fecha formateada', () => {
    configure();
    const { component } = createComponent();

    const [row] = component.documentRows();
    expect(row.entityName).toBe('Proceso 1');
    expect(row.entityTypeLabel).toBe('Proceso Legal');
    expect(row.iconPath).toBe('M0 0');
  });

  it('documentRows usa los textos de "no encontrado" cuando la entidad no existe en las listas cargadas', () => {
    configure();
    filesServiceMock.listFiles.mockReturnValue(
      of({ data: [buildFile({ entityType: 'legal_process', entityId: 'inexistente' }), buildFile({ id: 'f2', entityType: 'client', entityId: 'inexistente' })], total: 2, page: 1, limit: 10 }),
    );
    const { component } = createComponent();

    const [processRow, clientRow] = component.documentRows();
    expect(processRow.entityName).toBe('Proceso no encontrado');
    expect(clientRow.entityName).toBe('Cliente no encontrado');
  });

  it('documentRows usa "Entidad desconocida" y el código crudo como fallback para tipos no mapeados', () => {
    configure();
    filesServiceMock.listFiles.mockReturnValue(
      of({ data: [buildFile({ entityType: 'annotation_extra', entityId: 'x' })], total: 1, page: 1, limit: 10 }),
    );
    const { component } = createComponent();

    const [row] = component.documentRows();
    expect(row.entityName).toBe('Entidad desconocida');
    expect(row.entityTypeLabel).toBe('annotation_extra');
  });

  it('en error al cargar procesos o clientes, registra el error por consola', () => {
    configure();
    processesServiceMock.getLegalProcesses.mockReturnValue(throwError(() => new Error('fail')));
    clientsServiceMock.getClients.mockReturnValue(throwError(() => new Error('fail')));
    createComponent();

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('en error al cargar archivos, apaga el loading y registra el error', () => {
    configure();
    filesServiceMock.listFiles.mockReturnValue(throwError(() => new Error('fail')));
    const { component } = createComponent();

    expect(component.loading()).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('onFilterChange actualiza el filtro y recarga con el parámetro entityType', () => {
    configure();
    const { component } = createComponent();

    component.onFilterChange('client');

    expect(component.filterEntityType()).toBe('client');
    expect(filesServiceMock.listFiles).toHaveBeenLastCalledWith({ entityType: 'client' });
  });

  it('onOnlyMineChange actualiza el filtro y recarga con onlyMine:true', () => {
    configure();
    const { component } = createComponent();

    component.onOnlyMineChange(true);

    expect(component.onlyMine()).toBe(true);
    expect(filesServiceMock.listFiles).toHaveBeenLastCalledWith({ onlyMine: true });
  });

  it('onOnlyMineChange(false) recarga sin el parámetro onlyMine', () => {
    configure();
    const { component } = createComponent();

    component.onOnlyMineChange(true);
    component.onOnlyMineChange(false);

    expect(component.onlyMine()).toBe(false);
    expect(filesServiceMock.listFiles).toHaveBeenLastCalledWith({});
  });

  it('hasFullDocumentAccess refleja el permiso files.view.all del usuario', () => {
    filesServiceMock = {
      listFiles: jest.fn().mockReturnValue(of({ data: [], total: 0, page: 1, limit: 10 })),
      uploadFile: jest.fn(),
      previewFile: jest.fn(),
      downloadFile: jest.fn(),
      deleteFile: jest.fn(),
      formatFileSize: jest.fn().mockReturnValue('1 KB'),
      getFileIcon: jest.fn().mockReturnValue('M0 0'),
    };
    processesServiceMock = { getLegalProcesses: jest.fn().mockReturnValue(of({ message: '', legalProcesses: [], total: 0, page: 1, limit: 100 })) };
    clientsServiceMock = { getClients: jest.fn().mockReturnValue(of({ message: '', clients: [], total: 0, page: 1, limit: 100 })) };
    confirmDialogMock = { confirm: jest.fn() };

    TestBed.configureTestingModule({
      imports: [DocumentsComponent],
      providers: [
        { provide: FilesService, useValue: filesServiceMock },
        { provide: LegalProcessesService, useValue: processesServiceMock },
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn((perms: string[]) => perms.includes('files.view')),
            hasPermission: jest.fn((perm: string) => perm === 'files.view'),
            userPermissions: signal(['files.view']),
          },
        },
      ],
    });

    const { component } = createComponent();
    expect(component.hasFullDocumentAccess()).toBe(false);
  });

  it('toggleUploadPanel abre y cierra el panel, limpiando el archivo y el error al cerrar', () => {
    configure();
    const { component } = createComponent();

    component.toggleUploadPanel();
    expect(component.uploadPanelOpen()).toBe(true);

    component.onFileSelected(new File(['x'], 'a.pdf'));
    component.toggleUploadPanel();

    expect(component.uploadPanelOpen()).toBe(false);
    expect(component.selectedFile()).toBeNull();
    expect(component.uploadError()).toBeNull();
  });

  it('onEntityTypeChange limpia el entityId del formulario', () => {
    configure();
    const { component } = createComponent();
    component.uploadForm.patchValue({ entityId: 'p1' });

    component.onEntityTypeChange();

    expect(component.uploadForm.value.entityId).toBe('');
  });

  it('onFileSelected guarda el archivo elegido y limpia el error previo', () => {
    configure();
    const { component } = createComponent();
    component.uploadError.set('error previo');

    const file = new File(['x'], 'a.pdf');
    component.onFileSelected(file);

    expect(component.selectedFile()).toBe(file);
    expect(component.uploadError()).toBeNull();
  });

  it('handleUpload no hace nada si ya está subiendo, o si el form/archivo son inválidos', () => {
    configure();
    const { component } = createComponent();

    component.handleUpload();
    expect(filesServiceMock.uploadFile).not.toHaveBeenCalled();

    component.isUploading.set(true);
    component.uploadForm.patchValue({ entityId: 'p1' });
    component.onFileSelected(new File(['x'], 'a.pdf'));
    component.handleUpload();
    expect(filesServiceMock.uploadFile).not.toHaveBeenCalled();
  });

  it('handleUpload sube el archivo en éxito, resetea el estado y recarga la lista', () => {
    configure();
    filesServiceMock.uploadFile.mockReturnValue(of(buildFile()));
    const { component } = createComponent();

    component.uploadForm.patchValue({ entityId: 'p1' });
    const file = new File(['x'], 'a.pdf');
    component.onFileSelected(file);

    component.handleUpload();

    expect(filesServiceMock.uploadFile).toHaveBeenCalledWith(file, 'legal_process', 'p1');
    expect(component.isUploading()).toBe(false);
    expect(component.selectedFile()).toBeNull();
    expect(component.uploadPanelOpen()).toBe(false);
    expect(filesServiceMock.listFiles).toHaveBeenCalledTimes(2);
  });

  it('handleUpload en error, expone el mensaje de error', () => {
    configure();
    filesServiceMock.uploadFile.mockReturnValue(throwError(() => ({ error: { message: 'Archivo inválido' } })));
    const { component } = createComponent();

    component.uploadForm.patchValue({ entityId: 'p1' });
    component.onFileSelected(new File(['x'], 'a.pdf'));

    component.handleUpload();

    expect(component.uploadError()).toBe('Archivo inválido');
    expect(component.isUploading()).toBe(false);
  });

  it('previewFile en éxito setea la URL y el archivo previsualizado', () => {
    configure();
    filesServiceMock.previewFile.mockReturnValue(of('https://files.lexar.com/f1'));
    const { component } = createComponent();
    const file = buildFile();

    component.previewFile(file);

    expect(component.previewingFile()).toEqual(file);
    expect(component.previewUrl()).not.toBeNull();
  });

  it('previewFile en error, registra el error por consola', () => {
    configure();
    filesServiceMock.previewFile.mockReturnValue(throwError(() => new Error('fail')));
    const { component } = createComponent();

    component.previewFile(buildFile());

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(component.previewingFile()).toBeNull();
  });

  it('closePreview limpia la URL y el archivo previsualizado', () => {
    configure();
    filesServiceMock.previewFile.mockReturnValue(of('https://files.lexar.com/f1'));
    const { component } = createComponent();

    component.previewFile(buildFile());
    component.closePreview();

    expect(component.previewUrl()).toBeNull();
    expect(component.previewingFile()).toBeNull();
  });

  it('downloadFile en error muestra una alerta', () => {
    configure();
    filesServiceMock.downloadFile.mockReturnValue(throwError(() => new Error('fail')));
    const { component } = createComponent();

    component.downloadFile(buildFile());

    expect(alertSpy).toHaveBeenCalledWith('Error al descargar el archivo');
  });

  it('downloadFile en éxito no lanza errores', () => {
    configure();
    filesServiceMock.downloadFile.mockReturnValue(of(undefined));
    const { component } = createComponent();

    expect(() => component.downloadFile(buildFile())).not.toThrow();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('deleteFile no llama al servicio si el usuario cancela la confirmación', async () => {
    configure();
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.deleteFile(buildFile());

    expect(filesServiceMock.deleteFile).not.toHaveBeenCalled();
  });

  it('deleteFile recarga la lista en éxito', async () => {
    configure();
    filesServiceMock.deleteFile.mockReturnValue(of(undefined));
    const { component } = createComponent();

    await component.deleteFile(buildFile());

    expect(filesServiceMock.deleteFile).toHaveBeenCalledWith('f1');
    expect(filesServiceMock.listFiles).toHaveBeenCalledTimes(2);
  });

  it('deleteFile en error muestra una alerta con el mensaje del backend', async () => {
    configure();
    filesServiceMock.deleteFile.mockReturnValue(throwError(() => ({ error: { message: 'No se pudo eliminar' } })));
    const { component } = createComponent();

    await component.deleteFile(buildFile());

    expect(alertSpy).toHaveBeenCalledWith('Error al eliminar: No se pudo eliminar');
  });
});
