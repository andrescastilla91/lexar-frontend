import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { ProcessAnnotationModalComponent } from './process-annotation-modal.component';

describe('ProcessAnnotationModalComponent', () => {
  const fb = new FormBuilder();

  function buildForm(description = '') {
    return fb.nonNullable.group({
      description: [description, [Validators.required, Validators.maxLength(2000)]],
    });
  }

  function createComponent() {
    return TestBed.createComponent(ProcessAnnotationModalComponent);
  }

  it('no renderiza nada cuando isOpen es false', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('muestra el título del proceso', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('processTitle', 'Proceso Alfa');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Proceso Alfa');
  });

  it('muestra el contador de caracteres de la descripción', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm('hola'));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('4 / 2000 caracteres');
  });

  it('lista los archivos seleccionados con su tamaño formateado', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('files', [new File(['contenido'], 'evidencia.pdf', { type: 'application/pdf' })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('evidencia.pdf');
    expect(fixture.nativeElement.textContent).toContain('1 archivo(s) seleccionado(s)');
  });

  it('emite removeFile con el índice al hacer clic en quitar', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('files', [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    ]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.removeFile.subscribe(spy);

    const removeButtons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.space-y-2 button'),
    );
    removeButtons[1].click();

    expect(spy).toHaveBeenCalledWith(1);
  });

  it('emite filesSelected al cambiar el input de archivo', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.filesSelected.subscribe(spy);

    fixture.nativeElement.querySelector('input[type="file"]').dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalled();
  });

  it('deshabilita el botón de guardar cuando el formulario es inválido', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm(''));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
  });

  it('habilita el botón de guardar cuando el formulario es válido y no está enviando', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm('Descripción válida'));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(false);
  });

  it('emite close al hacer clic en cancelar', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.close.subscribe(spy);

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const cancelBtn = buttons.find((b) => b.textContent?.trim() === 'Cancelar');
    cancelBtn!.click();

    expect(spy).toHaveBeenCalled();
  });
});
