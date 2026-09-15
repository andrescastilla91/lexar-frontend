import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { UserFormComponent } from './user-form.component';

describe('UserFormComponent', () => {
  function createComponent() {
    const fb = TestBed.inject(FormBuilder);
    const form = fb.nonNullable.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
    });
    const fixture = TestBed.createComponent(UserFormComponent);
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, form };
  }

  it('no renderiza el formulario cuando isOpen es false', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('renderiza el formulario cuando isOpen es true', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nuevo usuario');
  });

  it('emite formCancel al hacer click en Cancelar', () => {
    const { fixture, component } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    const spy = jest.fn();
    component.formCancel.subscribe(spy);

    const cancelButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Cancelar',
    ) as HTMLButtonElement;
    cancelButton.click();

    expect(spy).toHaveBeenCalled();
  });

  it('emite formSubmit al enviar el formulario', () => {
    const { fixture, component } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    const spy = jest.fn();
    component.formSubmit.subscribe(spy);

    const formEl: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formEl.dispatchEvent(new Event('submit'));

    expect(spy).toHaveBeenCalled();
  });

  it('muestra el mensaje de error cuando errorMessage tiene contenido', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('errorMessage', 'Ya existe un usuario con ese email');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ya existe un usuario con ese email');
  });

  it('deshabilita el botón de envío cuando el formulario es inválido o isSubmitting es true', () => {
    const { fixture, form } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitButton.disabled).toBe(true);

    form.setValue({
      firstName: 'Ana',
      lastName: 'Gómez',
      email: 'ana@lexar.com',
    });
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(false);

    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(true);
  });

  // F35 rediseño 2026-09-15: el modal ya no incluye el perfil profesional
  // (asesor legal) — eso vive ahora en la ficha del usuario.
  it('no incluye el bloque de perfil profesional', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Es asesor legal');
    expect(fixture.nativeElement.querySelector('input[formcontrolname="isAdvisor"]')).toBeNull();
  });
});
