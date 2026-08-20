import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { SettingsLegalFormComponent } from './settings-legal-form.component';

describe('SettingsLegalFormComponent', () => {
  function createComponent() {
    const fb = TestBed.inject(FormBuilder);
    const fixture = TestBed.createComponent(SettingsLegalFormComponent);
    const form = fb.nonNullable.group({
      legalName: [''],
      address: [''],
      legalRepresentative: [''],
      city: [''],
      country: [''],
      phone: [''],
      email: [''],
      registrationNumber: [''],
      taxRegime: [''],
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

  it('muestra el NIT/RUT recibido como input, deshabilitado', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('taxId', 'TAXID-999');
    fixture.detectChanges();

    const taxIdInput: HTMLInputElement = fixture.nativeElement.querySelector('input[disabled]');
    expect(taxIdInput.value).toBe('TAXID-999');
  });

  it('muestra el mensaje de error cuando errorMessage no es null', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('errorMessage', 'No se pudieron guardar los datos legales.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron guardar los datos legales.');
  });

  it('deshabilita el botón de guardar mientras isSubmitting es true', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });
});
