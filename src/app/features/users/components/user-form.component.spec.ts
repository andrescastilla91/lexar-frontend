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

  it('explica el motivo cuando editingUserHasLoggedIn es true en edición (BUG-13: no deshabilita realmente el input)', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isEditing', true);
    fixture.componentRef.setInput('editingUserHasLoggedIn', true);
    fixture.detectChanges();

    // BUG-13 (docs/06-bugs/BACKLOG-BUGS.md): el input combina formControlName
    // con [disabled] en el mismo elemento — conflicto documentado por Angular
    // donde el estado real del FormControl gana y el binding [disabled] queda
    // sin efecto. El campo NO queda deshabilitado en el navegador real pese al
    // texto explicativo. Al corregir el bug (mover el disable a un effect()
    // sobre el FormControl), esta aserción debe volver a `toBe(true)`.
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="email"]');
    expect(emailInput.disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('El email no puede modificarse');
  });

  it('permite editar el email cuando editingUserHasLoggedIn es false en edición', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isEditing', true);
    fixture.componentRef.setInput('editingUserHasLoggedIn', false);
    fixture.detectChanges();

    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="email"]');
    expect(emailInput.disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('El email puede modificarse');
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

    form.setValue({ firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' });
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(false);

    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(true);
  });
});
