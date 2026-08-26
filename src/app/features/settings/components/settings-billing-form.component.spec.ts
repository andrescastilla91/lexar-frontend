import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { SettingsBillingFormComponent } from './settings-billing-form.component';

describe('SettingsBillingFormComponent', () => {
  function createComponent() {
    const fb = TestBed.inject(FormBuilder);
    const fixture = TestBed.createComponent(SettingsBillingFormComponent);
    const form = fb.nonNullable.group({ billingEmail: [''] });
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

  it('muestra el mensaje de error cuando errorMessage no es null', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('errorMessage', 'No se pudo guardar el correo de facturación.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo guardar el correo de facturación.');
  });

  it('no muestra ningún mensaje de error cuando errorMessage es null', () => {
    const { fixture } = createComponent();

    const errorBox = fixture.nativeElement.querySelector('.text-danger');
    expect(errorBox).toBeNull();
  });

  it('deshabilita el botón de guardar mientras isSubmitting es true', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });
});
