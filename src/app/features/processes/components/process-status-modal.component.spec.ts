import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ProcessStatusModalComponent } from './process-status-modal.component';
import { ProcessStatus } from '../../../core/models/legal-process.model';

describe('ProcessStatusModalComponent', () => {
  const fb = new FormBuilder();

  function buildForm() {
    return fb.nonNullable.group({
      status: [ProcessStatus.DRAFT],
      notes: [''],
    });
  }

  function createComponent() {
    return TestBed.createComponent(ProcessStatusModalComponent);
  }

  it('no renderiza nada cuando isOpen es false', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('muestra las opciones de los estados válidos siguientes', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('validNextStatuses', [ProcessStatus.ACTIVE, ProcessStatus.CANCELLED]);
    fixture.detectChanges();

    const options: HTMLOptionElement[] = Array.from(fixture.nativeElement.querySelectorAll('option'));
    expect(options.map((o) => o.value)).toEqual([ProcessStatus.ACTIVE, ProcessStatus.CANCELLED]);
    expect(fixture.nativeElement.textContent).toContain('Estados disponibles según el flujo de trabajo');
  });

  it('muestra el mensaje de sin transiciones cuando la lista está vacía', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('validNextStatuses', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay transiciones de estado disponibles desde el estado actual.');
  });

  it('emite submit al enviar el formulario', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.submit.subscribe(spy);

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(spy).toHaveBeenCalled();
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

  it('deshabilita el botón de actualizar cuando isSubmitting es true', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
  });

  it('muestra el mensaje de error cuando errorMessage está presente', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('errorMessage', 'Error al actualizar el estado');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Error al actualizar el estado');
  });
});
