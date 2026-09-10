import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DocumentsListComponent, DocumentRow } from './documents-list.component';
import { PermissionsService } from '../../../core/services/permissions.service';

function buildRow(overrides: Partial<DocumentRow> = {}): DocumentRow {
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
    iconPath: 'M0 0',
    entityName: 'Proceso 1',
    entityTypeLabel: 'Proceso Legal',
    formattedDate: '1 ene 2026',
    ...overrides,
  };
}

describe('DocumentsListComponent', () => {
  function configure(permissions: string[]): void {
    TestBed.configureTestingModule({
      imports: [DocumentsListComponent],
      providers: [
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn((perms: string[]) => perms.some((p) => permissions.includes(p))),
            hasPermission: jest.fn((perm: string) => permissions.includes(perm)),
            userPermissions: signal(permissions),
          },
        },
      ],
    });
  }

  function createComponent(
    files: DocumentRow[] = [buildRow()],
    isLoading = false,
    hasFullAccess = false,
  ) {
    const fixture = TestBed.createComponent(DocumentsListComponent);
    fixture.componentRef.setInput('files', files);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.componentRef.setInput('hasFullAccess', hasFullAccess);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('no renderiza nada cuando no hay permiso files.view', () => {
    configure([]);
    const { fixture } = createComponent();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('muestra el spinner de carga cuando isLoading es true', () => {
    configure(['files.view']);
    const { fixture } = createComponent([], true);
    expect(fixture.nativeElement.querySelector('.animate-spin')).not.toBeNull();
  });

  it('muestra el mensaje vacío cuando no hay archivos', () => {
    configure(['files.view']);
    const { fixture } = createComponent([]);
    expect(fixture.nativeElement.textContent).toContain('No hay archivos');
  });

  it('muestra el conteo de archivos en singular y plural', () => {
    configure(['files.view']);
    const { fixture: single } = createComponent([buildRow()]);
    expect(single.nativeElement.textContent).toContain('1 archivo');
    expect(single.nativeElement.textContent).not.toContain('1 archivos');

    const { fixture: multiple } = createComponent([buildRow({ id: 'f1' }), buildRow({ id: 'f2' })]);
    expect(multiple.nativeElement.textContent).toContain('2 archivos');
  });

  it('muestra el botón de vista previa solo si el archivo es previsualizable', () => {
    configure(['files.view']);
    const { fixture } = createComponent([buildRow({ isPreviewable: false })]);
    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);
    expect(titles).not.toContain('Vista previa');
  });

  it('muestra el botón de eliminar solo con permiso files.delete', () => {
    configure(['files.view']);
    const { fixture } = createComponent();
    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);
    expect(titles).not.toContain('Eliminar');
  });

  it('emite filterChange con el nuevo valor del select', () => {
    configure(['files.view']);
    const { fixture, component } = createComponent();
    const spy = jest.fn();
    component.filterChange.subscribe(spy);

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'client';
    select.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith('client');
  });

  it('emite refresh al hacer click en actualizar', () => {
    configure(['files.view']);
    const { fixture, component } = createComponent();
    const spy = jest.fn();
    component.refresh.subscribe(spy);

    const refreshButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).title === 'Actualizar',
    ) as HTMLButtonElement;
    refreshButton.click();

    expect(spy).toHaveBeenCalled();
  });

  it('F30: sin files.view.all no muestra el filtro Todos/Solo los míos y sí el texto explicativo', () => {
    configure(['files.view']);
    const { fixture } = createComponent([buildRow()], false, false);

    const selects = fixture.nativeElement.querySelectorAll('select');
    // solo el select de tipo de entidad, no el de Todos/Solo los míos
    expect(selects.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain(
      'Ves los documentos de los procesos y clientes a tu cargo.',
    );
  });

  it('F30: con files.view.all muestra el filtro Todos/Solo los míos y no el texto explicativo', () => {
    configure(['files.view', 'files.view.all']);
    const { fixture } = createComponent([buildRow()], false, true);

    const selects = fixture.nativeElement.querySelectorAll('select');
    expect(selects.length).toBe(2);
    expect(fixture.nativeElement.textContent).not.toContain(
      'Ves los documentos de los procesos y clientes a tu cargo.',
    );
  });

  it('F30: emite onlyMineChange(true) al seleccionar "Solo los míos"', () => {
    configure(['files.view', 'files.view.all']);
    const { fixture, component } = createComponent([buildRow()], false, true);
    const spy = jest.fn();
    component.onlyMineChange.subscribe(spy);

    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    const onlyMineSelect = selects[0];
    onlyMineSelect.value = 'mine';
    onlyMineSelect.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith(true);
  });

  it('emite previewFile, downloadFile y deleteFile con el archivo correspondiente', () => {
    configure(['files.view', 'files.delete']);
    const row = buildRow();
    const { fixture, component } = createComponent([row]);

    const previewSpy = jest.fn();
    const downloadSpy = jest.fn();
    const deleteSpy = jest.fn();
    component.previewFile.subscribe(previewSpy);
    component.downloadFile.subscribe(downloadSpy);
    component.deleteFile.subscribe(deleteSpy);

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find((b) => b.title === 'Vista previa')!.click();
    buttons.find((b) => b.title === 'Descargar')!.click();
    buttons.find((b) => b.title === 'Eliminar')!.click();

    expect(previewSpy).toHaveBeenCalledWith(row);
    expect(downloadSpy).toHaveBeenCalledWith(row);
    expect(deleteSpy).toHaveBeenCalledWith(row);
  });
});
