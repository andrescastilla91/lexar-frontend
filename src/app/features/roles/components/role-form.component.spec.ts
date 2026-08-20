import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { RoleFormComponent } from './role-form.component';

describe('RoleFormComponent', () => {
  function createComponent() {
    const fb = TestBed.inject(FormBuilder);
    const form = fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
    });
    const fixture = TestBed.createComponent(RoleFormComponent);
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, form };
  }

  it('no renderiza el formulario cuando isOpen es false', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('renderiza el formulario cuando isOpen es true, con título según isEditing', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nuevo rol');

    fixture.componentRef.setInput('isEditing', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Editar rol');
  });

  it('emite cancel al hacer click en Cancelar', () => {
    const { fixture, component } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    const spy = jest.fn();
    component.cancel.subscribe(spy);

    const cancelButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Cancelar',
    ) as HTMLButtonElement;
    cancelButton.click();

    expect(spy).toHaveBeenCalled();
  });

  it('emite submit al enviar el formulario', () => {
    const { fixture, component } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    const spy = jest.fn();
    component.submit.subscribe(spy);

    const formEl: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formEl.dispatchEvent(new Event('submit'));

    expect(spy).toHaveBeenCalled();
  });

  it('muestra el mensaje de error cuando errorMessage tiene contenido', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('errorMessage', 'El nombre ya existe');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El nombre ya existe');
  });

  it('deshabilita el botón de envío cuando el formulario es inválido o isSubmitting es true', () => {
    const { fixture, form } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitButton.disabled).toBe(true);

    form.patchValue({ name: 'Coordinador Legal' });
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(false);

    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(true);
  });
});
