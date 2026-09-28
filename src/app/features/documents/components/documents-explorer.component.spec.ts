import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DocumentsExplorerComponent } from './documents-explorer.component';
import { FilesService } from '../../../core/services/files.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DocumentTreeClientNode,
  DocumentTreeGroupNode,
  DocumentTreeTypeNode,
  FileModel,
} from '../../../core/models/file.model';

function buildClient(overrides: Partial<DocumentTreeClientNode> = {}): DocumentTreeClientNode {
  return { id: 'client-1', label: 'María González', documentCount: 3, ...overrides };
}

function buildMatterNode(overrides: Partial<DocumentTreeGroupNode> = {}): DocumentTreeGroupNode {
  return { kind: 'matter', id: 'matter-1', label: 'Litigio laboral', documentCount: 2, ...overrides };
}

function buildType(overrides: Partial<DocumentTreeTypeNode> = {}): DocumentTreeTypeNode {
  return {
    documentTypeId: 'doctype-1',
    label: 'Contrato',
    color: 'blue-500',
    documentCount: 1,
    ...overrides,
  };
}

function buildFile(overrides: Partial<FileModel> = {}): FileModel {
  return {
    id: 'file-1',
    entityType: 'legal_process',
    entityId: 'process-1',
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

describe('DocumentsExplorerComponent (F37 §DOC-01, ola 2)', () => {
  let filesServiceMock: {
    getDocumentTreeClients: jest.Mock;
    getDocumentTreeClientNodes: jest.Mock;
    getDocumentTreeTypes: jest.Mock;
    getDocumentTreeDocuments: jest.Mock;
    previewFile: jest.Mock;
    downloadFile: jest.Mock;
    deleteFile: jest.Mock;
    getFileIcon: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { error: jest.Mock };

  function configure(): void {
    filesServiceMock = {
      getDocumentTreeClients: jest.fn().mockReturnValue(of([buildClient()])),
      getDocumentTreeClientNodes: jest.fn().mockReturnValue(of([buildMatterNode()])),
      getDocumentTreeTypes: jest.fn().mockReturnValue(of([buildType()])),
      getDocumentTreeDocuments: jest
        .fn()
        .mockReturnValue(of({ data: [buildFile()], total: 1, page: 1, limit: 50 })),
      previewFile: jest.fn(),
      downloadFile: jest.fn().mockReturnValue(of(undefined)),
      deleteFile: jest.fn(),
      getFileIcon: jest.fn().mockReturnValue('M0 0'),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastMock = { error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [DocumentsExplorerComponent],
      providers: [
        { provide: FilesService, useValue: filesServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(DocumentsExplorerComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('al iniciar carga el nivel 0 (clientes)', () => {
    configure();
    const { component } = createComponent();

    expect(filesServiceMock.getDocumentTreeClients).toHaveBeenCalled();
    expect(component.level()).toBe(0);
    expect(component.clients()).toEqual([buildClient()]);
    expect(component.breadcrumbs()).toEqual([{ label: 'Clientes', level: 0 }]);
  });

  it('selectClient navega al nivel 1 y pide los nodos de ese cliente', () => {
    configure();
    const { component } = createComponent();

    component.selectClient(buildClient());

    expect(filesServiceMock.getDocumentTreeClientNodes).toHaveBeenCalledWith('client-1');
    expect(component.level()).toBe(1);
    expect(component.nodes()).toEqual([buildMatterNode()]);
    expect(component.breadcrumbs()).toEqual([
      { label: 'Clientes', level: 0 },
      { label: 'María González', level: 1 },
    ]);
  });

  it('selectNode (kind matter) navega al nivel 2 pidiendo tipos con matterId', () => {
    configure();
    const { component } = createComponent();
    component.selectClient(buildClient());

    component.selectNode(buildMatterNode());

    expect(filesServiceMock.getDocumentTreeTypes).toHaveBeenCalledWith(
      'client-1',
      'matter-1',
      undefined,
    );
    expect(component.level()).toBe(2);
    expect(component.types()).toEqual([buildType()]);
  });

  it('selectNode (kind process) pide tipos con processId, no matterId', () => {
    configure();
    const { component } = createComponent();
    component.selectClient(buildClient());

    component.selectNode({ kind: 'process', id: 'process-1', label: 'RGJ-000001', documentCount: 1 });

    expect(filesServiceMock.getDocumentTreeTypes).toHaveBeenCalledWith(
      'client-1',
      undefined,
      'process-1',
    );
  });

  it('selectNode (kind general) pide tipos sin matterId ni processId', () => {
    configure();
    const { component } = createComponent();
    component.selectClient(buildClient());

    component.selectNode({ kind: 'general', id: null, label: 'Documentos generales', documentCount: 1 });

    expect(filesServiceMock.getDocumentTreeTypes).toHaveBeenCalledWith(
      'client-1',
      undefined,
      undefined,
    );
  });

  it('selectType navega al nivel 3 y carga los documentos de ese tipo', () => {
    configure();
    const { component } = createComponent();
    component.selectClient(buildClient());
    component.selectNode(buildMatterNode());

    component.selectType(buildType());

    expect(filesServiceMock.getDocumentTreeDocuments).toHaveBeenCalledWith(
      'client-1',
      'doctype-1',
      'matter-1',
      undefined,
    );
    expect(component.level()).toBe(3);
    expect(component.documents()).toEqual([buildFile()]);
    expect(component.breadcrumbs()).toEqual([
      { label: 'Clientes', level: 0 },
      { label: 'María González', level: 1 },
      { label: 'Litigio laboral', level: 2 },
      { label: 'Contrato', level: 3 },
    ]);
  });

  it('goToLevel(0) limpia la selección y vuelve a pedir los clientes', () => {
    configure();
    const { component } = createComponent();
    component.selectClient(buildClient());
    component.selectNode(buildMatterNode());
    filesServiceMock.getDocumentTreeClients.mockClear();

    component.goToLevel(0);

    expect(filesServiceMock.getDocumentTreeClients).toHaveBeenCalledTimes(1);
    expect(component.selectedClient()).toBeNull();
    expect(component.selectedNode()).toBeNull();
    expect(component.level()).toBe(0);
  });

  it('goToLevel(1) limpia el nodo/tipo y vuelve a pedir los nodos del cliente actual', () => {
    configure();
    const { component } = createComponent();
    component.selectClient(buildClient());
    component.selectNode(buildMatterNode());
    component.selectType(buildType());
    filesServiceMock.getDocumentTreeClientNodes.mockClear();

    component.goToLevel(1);

    expect(filesServiceMock.getDocumentTreeClientNodes).toHaveBeenCalledWith('client-1');
    expect(component.selectedType()).toBeNull();
    expect(component.level()).toBe(1);
  });

  it('deleteFile: si se cancela la confirmación, no llama a FilesService.deleteFile', async () => {
    configure();
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.deleteFile(buildFile());

    expect(filesServiceMock.deleteFile).not.toHaveBeenCalled();
  });

  it('deleteFile: al confirmar, elimina y recarga el nivel 3', async () => {
    configure();
    filesServiceMock.deleteFile.mockReturnValue(of(undefined));
    const { component } = createComponent();
    component.selectClient(buildClient());
    component.selectNode(buildMatterNode());
    component.selectType(buildType());
    filesServiceMock.getDocumentTreeDocuments.mockClear();

    await component.deleteFile(buildFile());

    expect(filesServiceMock.deleteFile).toHaveBeenCalledWith('file-1');
    expect(filesServiceMock.getDocumentTreeDocuments).toHaveBeenCalledTimes(1);
  });

  it('deleteFile: en error, muestra el mensaje real vía ToastService', async () => {
    configure();
    filesServiceMock.deleteFile.mockReturnValue(
      throwError(() => ({ message: 'No se pudo eliminar' })),
    );
    const { component } = createComponent();

    await component.deleteFile(buildFile());

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo eliminar');
  });

  it('previewFile pide la URL firmada y la expone como previewingFile/previewUrl', () => {
    configure();
    filesServiceMock.previewFile.mockReturnValue(of('https://signed.example/preview'));
    const { component } = createComponent();
    const file = buildFile();

    component.previewFile(file);

    expect(component.previewingFile()).toBe(file);
    expect(component.previewUrl()).toBeTruthy();
  });

  it('closePreview limpia el archivo y la URL en vista previa', () => {
    configure();
    filesServiceMock.previewFile.mockReturnValue(of('https://signed.example/preview'));
    const { component } = createComponent();
    component.previewFile(buildFile());

    component.closePreview();

    expect(component.previewingFile()).toBeNull();
    expect(component.previewUrl()).toBeNull();
  });

  it('nodeKindLabel traduce cada kind a su etiqueta en español', () => {
    configure();
    const { component } = createComponent();

    expect(component.nodeKindLabel({ kind: 'matter', id: 'm1', label: 'x', documentCount: 1 })).toBe(
      'Asunto',
    );
    expect(component.nodeKindLabel({ kind: 'process', id: 'p1', label: 'x', documentCount: 1 })).toBe(
      'Proceso',
    );
    expect(component.nodeKindLabel({ kind: 'general', id: null, label: 'x', documentCount: 1 })).toBe(
      'General',
    );
  });
});
