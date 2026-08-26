import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { DocumentUploadPanelComponent } from './document-upload-panel.component';

function buildForm() {
  const fb = new FormBuilder();
  return fb.nonNullable.group({
    entityType: ['legal_process', Validators.required],
    entityId: ['', Validators.required],
  });
}

describe('DocumentUploadPanelComponent', () => {
  function createComponent(overrides: {
    isOpen?: boolean;
    selectedFile?: File | null;
    selectedFileSizeLabel?: string;
    isUploading?: boolean;
    uploadError?: string | null;
  } = {}) {
    TestBed.configureTestingModule({ imports: [DocumentUploadPanelComponent] });
    const fixture = TestBed.createComponent(DocumentUploadPanelComponent);
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', overrides.isOpen ?? true);
    fixture.componentRef.setInput('selectedFile', overrides.selectedFile ?? null);
    fixture.componentRef.setInput('selectedFileSizeLabel', overrides.selectedFileSizeLabel ?? '');
    fixture.componentRef.setInput('isUploading', overrides.isUploading ?? false);
    fixture.componentRef.setInput('uploadError', overrides.uploadError ?? null);
    fixture.componentRef.setInput('processes', [{ id: 'p1', label: 'Proceso 1' }]);
    fixture.componentRef.setInput('clients', [{ id: 'c1', label: 'Cliente 1' }]);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('no renderiza la sección cuando isOpen es false', () => {
    const { fixture } = createComponent({ isOpen: false });
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('muestra la opción de seleccionar archivo cuando no hay archivo elegido', () => {
    const { fixture } = createComponent();
    expect(fixture.nativeElement.textContent).toContain('Seleccionar archivo');
    expect(fixture.nativeElement.textContent).toContain('PDF, Word, Excel, imágenes');
  });

  it('muestra el nombre y tamaño del archivo cuando hay uno seleccionado', () => {
    const file = new File(['contenido'], 'contrato.pdf', { type: 'application/pdf' });
    const { fixture } = createComponent({ selectedFile: file, selectedFileSizeLabel: '9 B' });

    expect(fixture.nativeElement.textContent).toContain('contrato.pdf');
    expect(fixture.nativeElement.textContent).toContain('9 B');
  });

  it('muestra el estado "Subiendo..." cuando isUploading es true', () => {
    const { fixture } = createComponent({ isUploading: true });
    expect(fixture.nativeElement.textContent).toContain('Subiendo...');
  });

  it('muestra el mensaje de error cuando uploadError tiene valor', () => {
    const { fixture } = createComponent({ uploadError: 'Archivo demasiado grande' });
    expect(fixture.nativeElement.textContent).toContain('Archivo demasiado grande');
  });

  it('deshabilita el botón de subir si el form es inválido o no hay archivo', () => {
    const { fixture: withoutFile } = createComponent();
    expect((withoutFile.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('deshabilita el botón de subir mientras está subiendo', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    const { fixture: uploading } = createComponent({ selectedFile: file, isUploading: true });
    expect((uploading.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('habilita el botón de subir cuando el form es válido y hay un archivo seleccionado', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    TestBed.configureTestingModule({ imports: [DocumentUploadPanelComponent] });
    const fixture = TestBed.createComponent(DocumentUploadPanelComponent);
    const form = buildForm();
    form.patchValue({ entityId: 'p1' });
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('selectedFile', file);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('renderiza las opciones de procesos o clientes según el tipo de entidad', () => {
    TestBed.configureTestingModule({ imports: [DocumentUploadPanelComponent] });
    const fixture = TestBed.createComponent(DocumentUploadPanelComponent);
    const form = buildForm();
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('processes', [{ id: 'p1', label: 'Proceso 1' }]);
    fixture.componentRef.setInput('clients', [{ id: 'c1', label: 'Cliente 1' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Proceso 1');

    form.patchValue({ entityType: 'client' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cliente 1');
  });

  it('emite entityTypeChange al cambiar el tipo de entidad', () => {
    const { fixture, component } = createComponent();
    const spy = jest.fn();
    component.entityTypeChange.subscribe(spy);

    const select = fixture.nativeElement.querySelectorAll('select')[0] as HTMLSelectElement;
    select.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalled();
  });

  it('emite fileSelected con el archivo elegido en el input', () => {
    const { component } = createComponent();
    const spy = jest.fn();
    component.fileSelected.subscribe(spy);

    const file = new File(['x'], 'archivo.pdf', { type: 'application/pdf' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onFileSelected({ target: input } as unknown as Event);

    expect(spy).toHaveBeenCalledWith(file);
  });

  it('no emite fileSelected cuando no hay archivos en el input', () => {
    const { component } = createComponent();
    const spy = jest.fn();
    component.fileSelected.subscribe(spy);

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });

    component.onFileSelected({ target: input } as unknown as Event);

    expect(spy).not.toHaveBeenCalled();
  });

  it('emite submit al enviar el formulario', () => {
    const { fixture, component } = createComponent();
    const spy = jest.fn();
    component.submit.subscribe(spy);

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(spy).toHaveBeenCalled();
  });
});
