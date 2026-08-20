import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { SettingsSecurityFormComponent } from './settings-security-form.component';

describe('SettingsSecurityFormComponent', () => {
  function createComponent() {
    const fb = TestBed.inject(FormBuilder);
    const fixture = TestBed.createComponent(SettingsSecurityFormComponent);
    const form = fb.nonNullable.group({ require2fa: [false] });
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

  it('refleja el valor del checkbox require2fa desde el form', () => {
    const { fixture, form } = createComponent();
    form.get('require2fa')?.setValue(true);
    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type="checkbox"]');
    expect(checkbox.checked).toBe(true);
  });

  it('muestra el mensaje de error cuando errorMessage no es null', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('errorMessage', 'No se pudo guardar la política de seguridad.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo guardar la política de seguridad.');
  });

  it('deshabilita el botón de guardar mientras isSubmitting es true, sin depender de la validez del form', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });
});
