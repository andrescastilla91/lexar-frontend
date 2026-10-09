import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { optionalEmailValidator } from '../../../core/validators/email.validator';
import { SettingsLegalFormComponent } from './settings-legal-form.component';

describe('SettingsLegalFormComponent', () => {
  function createComponent() {
    const fb = TestBed.inject(FormBuilder);
    const fixture = TestBed.createComponent(SettingsLegalFormComponent);
    const form = fb.nonNullable.group({
      legalName: [''],
      address: [''],
      legalRepresentative: [''],
      department: [''],
      city: [''],
      country: [''],
      phone: [''],
      email: ['', [optionalEmailValidator]],
      registrationNumber: [''],
      taxRegime: [''],
      processCodePrefix: [''],
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

  // F40 §PRO-06
  it('muestra el texto de derivación automática cuando processCodeCounter es 0', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Si lo dejas vacío, se toma de la razón social.');
  });

  it('muestra el aviso de "no editable" cuando processCodeCounter > 0', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('processCodeCounter', 3);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No editable: ya hay procesos con código asignado.');
  });

  describe('hint del prefijo de código de proceso', () => {
    it('es breve: una frase de qué es y una de su estado', () => {
      const { fixture } = createComponent();
      const hint: HTMLElement = fixture.nativeElement.querySelector('[data-test="process-code-prefix-hint"]');

      expect(hint.textContent?.trim().length).toBeLessThan(110);
      expect(hint.textContent).toContain('RGJ-000001');
    });
  });

  describe('departamento y ciudad (listado oficial)', () => {
    const trigger = (fixture: { nativeElement: HTMLElement }, name: 'department' | 'city') =>
      fixture.nativeElement.querySelector(`[data-test="${name}"] button[role="combobox"]`) as HTMLButtonElement;
    const optionLabels = (fixture: { nativeElement: HTMLElement }) =>
      (Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')) as HTMLElement[]).map((o) =>
        o.textContent?.trim(),
      );
    const choose = (fixture: { nativeElement: HTMLElement; detectChanges: () => void }, label: string) => {
      const option = (Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')) as HTMLElement[]).find(
        (o) => o.textContent?.trim() === label,
      );
      option?.click();
      fixture.detectChanges();
    };

    it('la ciudad está deshabilitada hasta elegir el departamento', () => {
      const { fixture } = createComponent();

      expect(trigger(fixture, 'city').disabled).toBe(true);
      expect(trigger(fixture, 'city').textContent).toContain('Primero elige el departamento');
    });

    it('al elegir departamento, la ciudad ofrece solo sus municipios', () => {
      const { fixture, form } = createComponent();

      trigger(fixture, 'department').click();
      fixture.detectChanges();
      expect(optionLabels(fixture)).toHaveLength(33);
      choose(fixture, 'Antioquia');

      expect(form.get('department')?.value).toBe('Antioquia');
      expect(trigger(fixture, 'city').disabled).toBe(false);

      trigger(fixture, 'city').click();
      fixture.detectChanges();
      const cities = optionLabels(fixture);
      expect(cities).toContain('Medellín');
      expect(cities).not.toContain('Cali');
    });

    it('cuando el departamento llega cargado desde la empresa, la ciudad ya ofrece sus municipios', () => {
      const { fixture, form } = createComponent();

      form.patchValue({ department: 'Valle del Cauca', city: 'Cali' });
      fixture.detectChanges();

      expect(trigger(fixture, 'city').disabled).toBe(false);
      expect(trigger(fixture, 'city').textContent).toContain('Cali');
    });

    it('cambiar de departamento limpia una ciudad que ya no le pertenece', () => {
      const { fixture, form } = createComponent();
      form.patchValue({ department: 'Valle del Cauca', city: 'Cali' });
      fixture.detectChanges();

      trigger(fixture, 'department').click();
      fixture.detectChanges();
      choose(fixture, 'Antioquia');

      expect(form.get('city')?.value).toBe('');
    });

    it('avisa cuando la ciudad guardada antes no está en el listado', () => {
      const { fixture } = createComponent();
      fixture.componentRef.setInput('legacyCityNotice', 'Bogotá');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-test="legacy-city"]').textContent).toContain('Bogotá');
    });
  });

  describe('régimen tributario', () => {
    it('ofrece solo responsable y no responsable de IVA', () => {
      const { fixture, form } = createComponent();
      const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-test="tax-regime"] button[role="combobox"]',
      );

      trigger.click();
      fixture.detectChanges();
      const options = Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')) as HTMLElement[];
      expect(options).toHaveLength(2);
      expect(options[0].textContent).toContain('Responsable de IVA');
      expect(options[1].textContent).toContain('No responsable de IVA');

      options[1].click();
      fixture.detectChanges();
      expect(form.get('taxRegime')?.value).toBe('VAT_NOT_RESPONSIBLE');
    });

    it('avisa cuando el régimen guardado antes no se pudo interpretar', () => {
      const { fixture } = createComponent();
      fixture.componentRef.setInput('legacyTaxRegimeNotice', 'Régimen simple');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-test="legacy-tax-regime"]').textContent).toContain(
        'Régimen simple',
      );
    });
  });

  describe('correo de contacto', () => {
    it('muestra el aviso de correo inválido solo después de tocar el campo y bloquea guardar', () => {
      const { fixture, form } = createComponent();
      const error = () => fixture.nativeElement.querySelector('[data-test="contact-email-error"]');

      form.get('email')?.setValue('sin-dominio@x');
      fixture.detectChanges();
      expect(error()).toBeNull();

      form.get('email')?.markAsTouched();
      fixture.detectChanges();
      expect(error()?.textContent).toContain('correo válido');
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(button.disabled).toBe(true);

      form.get('email')?.setValue('contacto@bufete.com');
      fixture.detectChanges();
      expect(error()).toBeNull();
      expect(button.disabled).toBe(false);
    });
  });
});
