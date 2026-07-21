import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { ProfilePasswordFormComponent } from './profile-password-form.component';

describe('ProfilePasswordFormComponent', () => {
  function createComponent() {
    const fb = TestBed.inject(FormBuilder);
    const fixture = TestBed.createComponent(ProfilePasswordFormComponent);
    const form = fb.nonNullable.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
    });
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, form };
  }

  it('emite submit al enviar el formulario', () => {
    const { fixture, component } = createComponent();
    const submitSpy = jest.fn();
    component.submit.subscribe(submitSpy);

    const formEl: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formEl.dispatchEvent(new Event('submit'));

    expect(submitSpy).toHaveBeenCalled();
  });

  it('deshabilita el botón cuando el formulario es inválido', () => {
    const { fixture } = createComponent();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });

  it('habilita el botón cuando el formulario es válido y no está enviando', () => {
    const { fixture, form } = createComponent();
    form.setValue({ currentPassword: 'actual123', newPassword: 'nuevaClave123' });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(false);
  });

  it('muestra el mensaje de error cuando errorMessage está presente', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('errorMessage', 'Contraseña actual incorrecta');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Contraseña actual incorrecta');
  });
});
