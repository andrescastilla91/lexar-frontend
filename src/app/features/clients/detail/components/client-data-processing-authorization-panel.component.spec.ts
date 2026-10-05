import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ClientDataProcessingAuthorizationPanelComponent } from './client-data-processing-authorization-panel.component';
import { ClientsService } from '../../../../core/services/clients.service';
import { CatalogsService } from '../../../../core/services/catalogs.service';
import { FilesService } from '../../../../core/services/files.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { ClientResponse, ClientPersonType } from '../../../../core/models/client-backend.model';
import { FileModel } from '../../../../core/models/file.model';

const client: ClientResponse = {
  id: 'c1',
  fullName: 'Cliente Uno',
  personType: ClientPersonType.NATURAL,
  address: null,
  documentType: null,
  identificationNumber: '123456',
  riskLevel: null,
  laftRisk: null,
  isActive: true,
  createdAt: '2026-01-01',
  dataProcessingAuthorized: false,
  dataProcessingAuthorizedAt: null,
  dataProcessingAuthorizationMethod: null,
};

const authorizationDocumentType = {
  id: 'dt-leg02',
  catalogType: 'case_document_type' as const,
  code: 'AUTORIZACION_TRATAMIENTO_DATOS',
  label: 'Autorización de tratamiento de datos',
  color: 'warning',
  sortOrder: 9,
  isActive: true,
  isSystem: true,
  personTypeScope: null,
};

function makeFile(overrides: Partial<FileModel> = {}): FileModel {
  return {
    id: 'f1',
    entityType: 'client',
    entityId: 'c1',
    bucket: 'bucket',
    key: 'key',
    originalFilename: 'soporte.pdf',
    contentType: 'application/pdf',
    size: 1024,
    formattedSize: '1 KB',
    metadata: null,
    uploadedBy: { id: 'u1', email: 'u1@lexar.com' },
    isPreviewable: true,
    isImage: false,
    isPdf: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    documentTypeId: authorizationDocumentType.id,
    ...overrides,
  };
}

describe('ClientDataProcessingAuthorizationPanelComponent', () => {
  let clientsServiceMock: { updateClientCompliance: jest.Mock };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let filesServiceMock: { getFilesByEntity: jest.Mock; uploadFile: jest.Mock; downloadFile: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  function configureAndCreate(overrides: {
    canEdit?: boolean;
    client?: ClientResponse;
    files?: FileModel[];
    catalogItems?: typeof authorizationDocumentType[];
  } = {}) {
    clientsServiceMock = { updateClientCompliance: jest.fn().mockReturnValue(of(client)) };
    catalogsServiceMock = {
      getActiveCatalog: jest.fn().mockReturnValue(of(overrides.catalogItems ?? [authorizationDocumentType])),
    };
    filesServiceMock = {
      getFilesByEntity: jest.fn().mockReturnValue(of(overrides.files ?? [])),
      uploadFile: jest.fn(),
      downloadFile: jest.fn().mockReturnValue(of(undefined)),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ClientDataProcessingAuthorizationPanelComponent],
      providers: [
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: FilesService, useValue: filesServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal<string[]>([]),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(ClientDataProcessingAuthorizationPanelComponent);
    fixture.componentRef.setInput('clientId', 'c1');
    fixture.componentRef.setInput('client', overrides.client ?? client);
    fixture.componentRef.setInput('canEdit', overrides.canEdit ?? true);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('resuelve el tipo documental y filtra los archivos adjuntos por él', () => {
    const matching = makeFile({ id: 'f-match' });
    const other = makeFile({ id: 'f-other', documentTypeId: 'otro-tipo' });
    const { component } = configureAndCreate({ files: [matching, other] });

    expect(component.attachedFiles().map((f) => f.id)).toEqual(['f-match']);
  });

  it('precarga el formulario con los valores actuales del cliente', () => {
    const authorizedClient: ClientResponse = {
      ...client,
      dataProcessingAuthorized: true,
      dataProcessingAuthorizedAt: '2026-09-15T00:00:00.000Z',
      dataProcessingAuthorizationMethod: 'DIGITAL' as any,
    };
    const { component } = configureAndCreate({ client: authorizedClient });

    expect(component.form.getRawValue()).toEqual({
      authorized: true,
      authorizedAt: '2026-09-15',
      method: 'DIGITAL',
    });
  });

  it('deshabilita el formulario cuando canEdit es false', () => {
    const { component } = configureAndCreate({ canEdit: false });

    expect(component.form.disabled).toBe(true);
  });

  it('guarda la autorización con fecha y medio, y emite el cliente actualizado', () => {
    const updatedClient: ClientResponse = { ...client, dataProcessingAuthorized: true };
    const { component } = configureAndCreate();
    clientsServiceMock.updateClientCompliance.mockReturnValue(of(updatedClient));
    const emitted: ClientResponse[] = [];
    component.updated.subscribe((c) => emitted.push(c));

    component.form.setValue({ authorized: true, authorizedAt: '2026-10-01', method: 'DIGITAL' });
    component.save();

    expect(clientsServiceMock.updateClientCompliance).toHaveBeenCalledWith('c1', {
      dataProcessingAuthorized: true,
      dataProcessingAuthorizedAt: '2026-10-01',
      dataProcessingAuthorizationMethod: 'DIGITAL',
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Cliente actualizado exitosamente');
    expect(emitted).toEqual([updatedClient]);
  });

  it('no envía fecha/medio al desmarcar la autorización', () => {
    const { component } = configureAndCreate();

    component.form.setValue({ authorized: false, authorizedAt: '', method: '' });
    component.save();

    expect(clientsServiceMock.updateClientCompliance).toHaveBeenCalledWith('c1', {
      dataProcessingAuthorized: false,
    });
  });

  it('no guarda y muestra un error si marca autorizado sin fecha ni medio', () => {
    const { component } = configureAndCreate();

    component.form.setValue({ authorized: true, authorizedAt: '', method: '' });
    component.save();

    expect(clientsServiceMock.updateClientCompliance).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('requeridos');
  });

  it('no guarda y muestra un error si marca autorización física sin soporte adjunto', () => {
    const { component } = configureAndCreate({ files: [] });

    component.form.setValue({ authorized: true, authorizedAt: '2026-10-01', method: 'FISICA' });
    component.save();

    expect(clientsServiceMock.updateClientCompliance).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('soporte adjunto');
  });

  it('guarda la autorización física cuando ya hay un soporte adjunto cargado', () => {
    const { component } = configureAndCreate({ files: [makeFile()] });

    component.form.setValue({ authorized: true, authorizedAt: '2026-10-01', method: 'FISICA' });
    component.save();

    expect(clientsServiceMock.updateClientCompliance).toHaveBeenCalledWith('c1', {
      dataProcessingAuthorized: true,
      dataProcessingAuthorizedAt: '2026-10-01',
      dataProcessingAuthorizationMethod: 'FISICA',
    });
  });

  it('muestra un toast de error si falla el guardado', () => {
    const { component } = configureAndCreate();
    clientsServiceMock.updateClientCompliance.mockReturnValue(
      throwError(() => new Error('Error al actualizar cliente')),
    );

    component.form.setValue({ authorized: false, authorizedAt: '', method: '' });
    component.save();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al actualizar cliente');
    expect(component.errorMessage()).toBe('Error al actualizar cliente');
  });

  it('sube el soporte adjunto pineado al tipo documental resuelto', () => {
    const uploaded = makeFile({ id: 'f-new' });
    const { component } = configureAndCreate();
    filesServiceMock.uploadFile.mockReturnValue(of(uploaded));
    const file = new File(['contenido'], 'soporte.pdf', { type: 'application/pdf' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    const event = { target: input } as unknown as Event;

    component.onFileSelected(event);

    expect(filesServiceMock.uploadFile).toHaveBeenCalledWith(
      file,
      'client',
      'c1',
      undefined,
      undefined,
      authorizationDocumentType.id,
    );
    expect(component.attachedFiles().map((f) => f.id)).toContain('f-new');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Soporte cargado exitosamente');
  });

  it('no sube nada y avisa si no se pudo resolver el tipo documental', () => {
    const { component } = configureAndCreate({ catalogItems: [] });
    const file = new File(['contenido'], 'soporte.pdf', { type: 'application/pdf' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    const event = { target: input } as unknown as Event;

    component.onFileSelected(event);

    expect(filesServiceMock.uploadFile).not.toHaveBeenCalled();
    expect(toastServiceMock.error).toHaveBeenCalledWith(
      'No se pudo determinar el tipo documental del soporte',
    );
  });

  it('descarga un archivo adjunto', () => {
    const { component } = configureAndCreate();

    component.downloadFile(makeFile());

    expect(filesServiceMock.downloadFile).toHaveBeenCalledWith('f1');
  });
});
