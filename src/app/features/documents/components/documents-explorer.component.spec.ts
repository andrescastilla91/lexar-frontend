import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DocumentsExplorerComponent } from './documents-explorer.component';
import { FilesService } from '../../../core/services/files.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
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
    getDocumentTreeUnclassified: jest.Mock;
    classifyDocumentType: jest.Mock;
    getAuditHistory: jest.Mock;
    previewFile: jest.Mock;
    downloadFile: jest.Mock;
    deleteFile: jest.Mock;
    getFileIcon: jest.Mock;
  };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastMock: { error: jest.Mock; success: jest.Mock };

  function configure(): void {
    filesServiceMock = {
      getDocumentTreeClients: jest.fn().mockReturnValue(of([buildClient()])),
      getDocumentTreeClientNodes: jest.fn().mockReturnValue(of([buildMatterNode()])),
      getDocumentTreeTypes: jest.fn().mockReturnValue(of([buildType()])),
      getDocumentTreeDocuments: jest
        .fn()
        .mockReturnValue(of({ data: [buildFile()], total: 1, page: 1, limit: 50 })),
      getDocumentTreeUnclassified: jest
        .fn()
        .mockReturnValue(of({ data: [], total: 0, page: 1, limit: 20 })),
      classifyDocumentType: jest.fn(),
      getAuditHistory: jest
        .fn()
        .mockReturnValue(of({ data: [], total: 0, page: 1, limit: 20 })),
      previewFile: jest.fn(),
      downloadFile: jest.fn().mockReturnValue(of(undefined)),
      deleteFile: jest.fn(),
      getFileIcon: jest.fn().mockReturnValue('M0 0'),
    };
    catalogsServiceMock = {
      getActiveCatalog: jest.fn().mockReturnValue(of([{ id: 'doctype-1', label: 'Contrato' }])),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastMock = { error: jest.fn(), success: jest.fn() };

    TestBed.configureTestingModule({
      imports: [DocumentsExplorerComponent],
      providers: [
        { provide: FilesService, useValue: filesServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
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

  describe('F37 §DOC-02 (ola 3) — bandeja "Sin clasificar"', () => {
    it('al iniciar, pide el total de la bandeja y el catálogo de tipos documentales', () => {
      configure();
      filesServiceMock.getDocumentTreeUnclassified = jest
        .fn()
        .mockReturnValue(of({ data: [], total: 2, page: 1, limit: 1 }));
      const { component } = createComponent();

      expect(filesServiceMock.getDocumentTreeUnclassified).toHaveBeenCalledWith(1, 1);
      expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('case_document_type');
      expect(component.unclassifiedTotal()).toBe(2);
      expect(component.documentTypeOptions()).toEqual([{ id: 'doctype-1', label: 'Contrato' }]);
    });

    it('openUnclassifiedTray navega al nivel 4 con la lista completa', () => {
      configure();
      const unclassifiedFile = buildFile({ id: 'file-unclassified' });
      filesServiceMock.getDocumentTreeUnclassified.mockReturnValue(
        of({ data: [unclassifiedFile], total: 1, page: 1, limit: 100 }),
      );
      const { component } = createComponent();

      component.openUnclassifiedTray();

      expect(component.level()).toBe(4);
      expect(component.unclassifiedDocuments()).toEqual([unclassifiedFile]);
      expect(component.breadcrumbs()).toEqual([
        { label: 'Clientes', level: 0 },
        { label: 'Sin clasificar', level: 4 },
      ]);
    });

    it('saveClassification no llama al servicio si no hay tipo documental seleccionado', () => {
      configure();
      const { component } = createComponent();

      component.saveClassification(buildFile());

      expect(filesServiceMock.classifyDocumentType).not.toHaveBeenCalled();
    });

    it('saveClassification clasifica, quita el archivo de la bandeja y decrementa el total', () => {
      configure();
      filesServiceMock.classifyDocumentType.mockReturnValue(of(buildFile({ documentTypeId: 'doctype-1' })));
      const unclassifiedFile = buildFile({ id: 'file-unclassified' });
      filesServiceMock.getDocumentTreeUnclassified.mockReturnValue(
        of({ data: [unclassifiedFile], total: 1, page: 1, limit: 100 }),
      );
      const { component } = createComponent();
      component.openUnclassifiedTray();
      component.onDocumentTypeSelected('file-unclassified', 'doctype-1');

      component.saveClassification(unclassifiedFile);

      expect(filesServiceMock.classifyDocumentType).toHaveBeenCalledWith(
        'file-unclassified',
        'doctype-1',
      );
      expect(component.unclassifiedDocuments()).toEqual([]);
      expect(component.unclassifiedTotal()).toBe(0);
      expect(toastMock.success).toHaveBeenCalled();
    });

    it('saveClassification en error muestra el mensaje real vía ToastService', () => {
      configure();
      filesServiceMock.classifyDocumentType.mockReturnValue(
        throwError(() => ({ message: 'Tipo de documento inválido' })),
      );
      const { component } = createComponent();
      component.onDocumentTypeSelected('file-1', 'doctype-1');

      component.saveClassification(buildFile());

      expect(toastMock.error).toHaveBeenCalledWith('Tipo de documento inválido');
    });
  });

  describe('F37 §DOC-06 (ola 4) — historial de auditoría de un documento', () => {
    it('openAuditHistory pide el historial y lo deja disponible en los signals', () => {
      configure();
      const entries = [
        {
          id: 'log-1',
          action: 'download',
          userEmail: 'a@b.com',
          source: 'internal' as const,
          createdAt: new Date('2026-09-29'),
        },
      ];
      filesServiceMock.getAuditHistory.mockReturnValue(
        of({ data: entries, total: 1, page: 1, limit: 20 }),
      );
      const { component } = createComponent();
      const file = buildFile();

      component.openAuditHistory(file);

      expect(filesServiceMock.getAuditHistory).toHaveBeenCalledWith(file.id);
      expect(component.auditHistoryFile()).toEqual(file);
      expect(component.auditHistoryEntries()).toEqual(entries);
      expect(component.auditHistoryLoading()).toBe(false);
    });

    it('openAuditHistory en error limpia el loading y notifica vía ToastService', () => {
      configure();
      filesServiceMock.getAuditHistory.mockReturnValue(
        throwError(() => ({ message: 'No se pudo obtener el historial' })),
      );
      const { component } = createComponent();

      component.openAuditHistory(buildFile());

      expect(component.auditHistoryLoading()).toBe(false);
      expect(toastMock.error).toHaveBeenCalledWith('No se pudo obtener el historial');
    });

    it('closeAuditHistory limpia el archivo y las entradas', () => {
      configure();
      filesServiceMock.getAuditHistory.mockReturnValue(
        of({ data: [], total: 0, page: 1, limit: 20 }),
      );
      const { component } = createComponent();
      component.openAuditHistory(buildFile());

      component.closeAuditHistory();

      expect(component.auditHistoryFile()).toBeNull();
      expect(component.auditHistoryEntries()).toEqual([]);
    });
  });
});
