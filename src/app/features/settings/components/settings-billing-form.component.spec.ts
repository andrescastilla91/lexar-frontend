import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { optionalEmailValidator } from '../../../core/validators/email.validator';
import { SettingsBillingFormComponent } from './settings-billing-form.component';

describe('SettingsBillingFormComponent', () => {
  function createComponent(taxId = '900123456') {
    const fb = TestBed.inject(FormBuilder);
    const fixture = TestBed.createComponent(SettingsBillingFormComponent);
    const form = fb.nonNullable.group({
      billingEmail: ['', [optionalEmailValidator]],
      billingContactName: [''],
      personType: [''],
      taxIdCheckDigit: ['', [Validators.pattern(/^\d?$/)]],
      fiscalAddress: [''],
      fiscalResponsibilities: [[] as string[]],
    });
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('taxId', taxId);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, form };
  }

  const hint = (fixture: { nativeElement: HTMLElement }) =>
    fixture.nativeElement.querySelector('[data-test="check-digit-hint"]')?.textContent?.trim();

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

    const errorBox = fixture.nativeElement.querySelector('.bg-danger-tint');
    expect(errorBox).toBeNull();
  });

  it('deshabilita el botón de guardar mientras isSubmitting es true', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
  });

  describe('correo y tipo de persona', () => {
    it('avisa que el correo de facturación no es válido solo después de tocarlo', () => {
      const { fixture, form } = createComponent();
      const error = () => fixture.nativeElement.querySelector('[data-test="billing-email-error"]');

      form.controls.billingEmail.setValue('facturas@empresa');
      fixture.detectChanges();
      expect(error()).toBeNull();

      form.controls.billingEmail.markAsTouched();
      fixture.detectChanges();
      expect(error()?.textContent).toContain('correo válido');
      expect(
        fixture.nativeElement.querySelector('[data-test="billing-email"]').getAttribute('aria-invalid'),
      ).toBe('true');

      form.controls.billingEmail.setValue('facturas@empresa.com');
      fixture.detectChanges();
      expect(error()).toBeNull();
    });

    it('el tipo de persona se elige con el selector personalizado', () => {
      const { fixture, form } = createComponent();
      const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-test="person-type"] button[role="combobox"]',
      );

      trigger.click();
      fixture.detectChanges();
      const options = Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')) as HTMLElement[];
      expect(options.map((option) => option.textContent?.trim())).toEqual(['Persona jurídica', 'Persona natural']);
      options[1].click();
      fixture.detectChanges();

      expect(form.controls.personType.value).toBe('NATURAL_PERSON');
      expect(trigger.textContent).toContain('Persona natural');
      expect(fixture.nativeElement.querySelector('select')).toBeNull();
    });
  });

  describe('dígito de verificación (F45)', () => {
    it('sugiere el dígito calculado para el NIT de la empresa', () => {
      const { fixture } = createComponent('890903938');

      expect(hint(fixture)).toContain('es 8');
    });

    it('avisa cuando el dígito digitado no corresponde al NIT', () => {
      const { fixture, form } = createComponent('890903938');

      form.controls.taxIdCheckDigit.setValue('3');
      fixture.detectChanges();

      expect(hint(fixture)).toContain('debería ser 8');
    });

    it('si el NIT ya trae el dígito pegado indica que el campo puede quedar vacío', () => {
      const { fixture } = createComponent('890903938-8');

      expect(hint(fixture)).toContain('ya incluye el dígito');
    });

    it('rechaza más de un dígito o letras', () => {
      const { form } = createComponent();

      form.controls.taxIdCheckDigit.setValue('12');
      expect(form.invalid).toBe(true);
      form.controls.taxIdCheckDigit.setValue('a');
      expect(form.invalid).toBe(true);
      form.controls.taxIdCheckDigit.setValue('7');
      expect(form.valid).toBe(true);
    });
  });

  describe('responsabilidades fiscales (F45)', () => {
    it('marcar y desmarcar una responsabilidad actualiza la lista del formulario', () => {
      const { fixture, form } = createComponent();
      const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

      checkboxes[0].checked = true;
      checkboxes[0].dispatchEvent(new Event('change'));
      expect(form.controls.fiscalResponsibilities.value).toEqual(['O-13']);

      checkboxes[0].checked = false;
      checkboxes[0].dispatchEvent(new Event('change'));
      expect(form.controls.fiscalResponsibilities.value).toEqual([]);
    });

    it('refleja como marcadas las responsabilidades ya guardadas', () => {
      const { fixture, form } = createComponent();

      form.controls.fiscalResponsibilities.setValue(['O-15']);
      fixture.detectChanges();

      const checked = Array.from(
        fixture.nativeElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>,
      ).map((input) => input.checked);
      expect(checked).toEqual([false, true, false, false, false]);
    });
  });
});
