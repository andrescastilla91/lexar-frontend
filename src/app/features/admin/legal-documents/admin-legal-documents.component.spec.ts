import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminLegalDocumentsComponent } from './admin-legal-documents.component';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { LegalDocumentAdmin } from '../../../core/models/admin.model';

describe('AdminLegalDocumentsComponent', () => {
  let platformAdminServiceMock: {
    listLegalDocuments: jest.Mock;
    publishLegalDocument: jest.Mock;
  };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const docA: LegalDocumentAdmin = {
    id: 'doc-1',
    type: 'internal_terms',
    version: '1.0',
    originalFilename: 'terminos.pdf',
    contentType: 'application/pdf',
    isCurrent: true,
    isSubstantialChange: true,
    publishedAt: '2026-09-30T00:00:00.000Z',
  };
  const docB: LegalDocumentAdmin = {
    id: 'doc-2',
    type: 'data_processing_policy',
    version: '1.0',
    originalFilename: 'tratamiento-datos.pdf',
    contentType: 'application/pdf',
    isCurrent: false,
    isSubstantialChange: false,
    publishedAt: '2026-08-01T00:00:00.000Z',
  };

  function configure(): void {
    platformAdminServiceMock = {
      listLegalDocuments: jest.fn().mockReturnValue(of([docA, docB])),
      publishLegalDocument: jest.fn(),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AdminLegalDocumentsComponent],
      providers: [
        { provide: PlatformAdminService, useValue: platformAdminServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AdminLegalDocumentsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga el listado de documentos', () => {
    const component = createComponent();

    expect(component.documents()).toEqual([docA, docB]);
  });

  it('al inicializar en error notifica el mensaje sin romper el listado', () => {
    platformAdminServiceMock.listLegalDocuments.mockReturnValue(
      throwError(() => new Error('Error al cargar los documentos legales')),
    );

    const component = createComponent();

    expect(component.documents()).toEqual([]);
    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al cargar los documentos legales');
  });

  it('filteredDocuments devuelve todo cuando el filtro es "all"', () => {
    const component = createComponent();

    expect(component.filteredDocuments()).toEqual([docA, docB]);
  });

  it('filteredDocuments filtra por tipo cuando se selecciona uno', () => {
    const component = createComponent();

    component.selectedTypeFilter.set('data_processing_policy');

    expect(component.filteredDocuments()).toEqual([docB]);
  });

  it('onTypeFilterChange actualiza selectedTypeFilter a partir del <select>', () => {
    const component = createComponent();
    const target = { value: 'internal_terms' } as unknown as HTMLSelectElement;

    component.onTypeFilterChange({ target } as unknown as Event);

    expect(component.selectedTypeFilter()).toBe('internal_terms');
  });

  it('typeLabel resuelve la etiqueta legible de un tipo', () => {
    const component = createComponent();

    expect(component.typeLabel('internal_terms')).toBe('Términos de uso interno');
    expect(component.typeLabel('data_processing_policy')).toBe('Política de tratamiento de datos');
  });

  it('togglePublishForm alterna la visibilidad del formulario', () => {
    const component = createComponent();

    component.togglePublishForm();
    expect(component.showPublishForm()).toBe(true);

    component.togglePublishForm();
    expect(component.showPublishForm()).toBe(false);
  });

  it('onFileSelected guarda el archivo elegido', () => {
    const component = createComponent();
    const file = new File(['contenido'], 'terminos.pdf', { type: 'application/pdf' });
    const target = { files: [file] } as unknown as HTMLInputElement;

    component.onFileSelected({ target } as unknown as Event);

    expect(component.selectedFile()).toBe(file);
  });

  it('onPublish no envía si el formulario es inválido', () => {
    const component = createComponent();
    component.publishForm.patchValue({ version: '' });

    component.onPublish();

    expect(platformAdminServiceMock.publishLegalDocument).not.toHaveBeenCalled();
    expect(component.publishForm.get('version')?.touched).toBe(true);
  });

  it('onPublish no envía si no hay archivo seleccionado', () => {
    const component = createComponent();
    component.publishForm.patchValue({ version: '1.0' });

    component.onPublish();

    expect(platformAdminServiceMock.publishLegalDocument).not.toHaveBeenCalled();
  });

  it('onPublish en éxito publica el documento, recarga el listado y cierra el formulario', () => {
    platformAdminServiceMock.publishLegalDocument.mockReturnValue(of(docA));
    const component = createComponent();
    const file = new File(['contenido'], 'terminos.pdf', { type: 'application/pdf' });
    component.showPublishForm.set(true);
    component.publishForm.setValue({ type: 'internal_terms', version: '1.0', isSubstantialChange: true });
    component.onFileSelected({ target: { files: [file] } } as unknown as Event);

    component.onPublish();

    expect(platformAdminServiceMock.publishLegalDocument).toHaveBeenCalledWith({
      type: 'internal_terms',
      version: '1.0',
      isSubstantialChange: true,
      file,
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Documento publicado correctamente.');
    expect(component.showPublishForm()).toBe(false);
    expect(component.selectedFile()).toBeNull();
    expect(component.isSaving()).toBe(false);
  });

  it('onPublish en error notifica y deja el formulario abierto', () => {
    platformAdminServiceMock.publishLegalDocument.mockReturnValue(
      throwError(() => new Error('Ya existe la versión 1.0 de internal_terms')),
    );
    const component = createComponent();
    const file = new File(['contenido'], 'terminos.pdf', { type: 'application/pdf' });
    component.showPublishForm.set(true);
    component.publishForm.setValue({ type: 'internal_terms', version: '1.0', isSubstantialChange: true });
    component.onFileSelected({ target: { files: [file] } } as unknown as Event);

    component.onPublish();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Ya existe la versión 1.0 de internal_terms');
    expect(component.showPublishForm()).toBe(true);
    expect(component.isSaving()).toBe(false);
  });
});
