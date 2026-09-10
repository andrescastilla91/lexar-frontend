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

  it('explica el motivo y refleja el disabled real del FormControl cuando editingUserHasLoggedIn es true en edición', () => {
    const { fixture, form } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isEditing', true);
    fixture.componentRef.setInput('editingUserHasLoggedIn', true);

    // BUG-14 (docs/06-bugs/BUG-14-email-usuario-no-queda-deshabilitado.md):
    // el input combinaba formControlName con [disabled] en el mismo elemento
    // — conflicto documentado por Angular donde el estado real del
    // FormControl gana y el binding [disabled] queda sin efecto. El fix
    // quitó el binding [disabled] del template: quien deshabilita el campo
    // es SIEMPRE el FormControl real — en producción, UsersComponent.editUser()
    // ya llama form.get('email')?.disable(). Este test reproduce esa misma
    // responsabilidad del contenedor para probar que, sin binding en
    // competencia, el input SÍ respeta el estado real del control.
    form.get('email')?.disable();
    fixture.detectChanges();

    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="email"]');
    expect(emailInput.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('El email no puede modificarse');
  });

  it('permite editar el email cuando editingUserHasLoggedIn es false en edición', () => {
    const { fixture, form } = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isEditing', true);
    fixture.componentRef.setInput('editingUserHasLoggedIn', false);
    fixture.detectChanges();

    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="email"]');
    expect(emailInput.disabled).toBe(false);
    expect(form.get('email')?.disabled).toBe(false);
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
