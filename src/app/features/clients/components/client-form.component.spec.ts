import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { ClientFormComponent } from './client-form.component';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { ClientPersonType } from '../../../core/models/client-backend.model';
import { identificationNumberValidator } from '../utils/identification-number.validator';

const documentTypes: CatalogItem[] = [
  { id: 'd1', catalogType: 'document_type', code: 'CC', label: 'Cédula', color: null, sortOrder: 0, isActive: true, isSystem: true, personTypeScope: 'NATURAL' },
  { id: 'd2', catalogType: 'document_type', code: 'PAS', label: 'Pasaporte', color: null, sortOrder: 1, isActive: true, isSystem: true, personTypeScope: null },
  { id: 'd3', catalogType: 'document_type', code: 'NIT', label: 'NIT', color: null, sortOrder: 2, isActive: true, isSystem: true, personTypeScope: 'JURIDICA' },
];
const riskLevels: CatalogItem[] = [
  { id: 'r1', catalogType: 'risk_level', code: 'LOW', label: 'Bajo', color: '#22c55e', sortOrder: 0, isActive: true, isSystem: true, personTypeScope: null },
];
const advisors: AdvisorResponse[] = [
  {
    id: 'a1',
    userId: 'u1',
    specialty: { id: 's1', code: 'CIVIL', label: 'Civil', color: null },
    phone: null,
    status: 'ACTIVE',
    rating: null,
    experienceYears: 3,
    isActive: true,
    companyId: 'c1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    user: { id: 'u1', firstName: 'Ana', lastName: 'Pérez' },
  },
];

function buildForm() {
  const fb = new FormBuilder();
  return fb.nonNullable.group(
    {
      personType: [ClientPersonType.NATURAL],
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      address: [''],
      documentTypeId: ['', [Validators.required]],
      identificationNumber: ['', [Validators.required]],
      riskLevelId: [''],
      advisorIds: [[] as string[]],
    },
    { validators: [identificationNumberValidator(() => documentTypes)] },
  );
}

describe('ClientFormComponent', () => {
  function createComponent(overrides: {
    isOpen?: boolean;
    isSubmitting?: boolean;
    errorMessage?: string | null;
  } = {}) {
    TestBed.configureTestingModule({ imports: [ClientFormComponent] });
    const fixture = TestBed.createComponent(ClientFormComponent);
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', overrides.isOpen ?? true);
    fixture.componentRef.setInput('isSubmitting', overrides.isSubmitting ?? false);
    fixture.componentRef.setInput('errorMessage', overrides.errorMessage ?? null);
    fixture.componentRef.setInput('documentTypes', documentTypes);
    fixture.componentRef.setInput('riskLevels', riskLevels);
    fixture.componentRef.setInput('advisors', advisors);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('no renderiza el formulario cuando isOpen es false', () => {
    const { fixture } = createComponent({ isOpen: false });
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('muestra el título "Nuevo cliente"', () => {
    const { fixture } = createComponent();
    expect(fixture.nativeElement.textContent).toContain('Nuevo cliente');
  });

  it('muestra los mensajes de validación al tocar los campos requeridos', () => {
    const { fixture, component } = createComponent();
    component.form().markAllAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Campo requerido');
  });

  it('muestra el mensaje de error general cuando errorMessage tiene valor', () => {
    const { fixture } = createComponent({ errorMessage: 'Error al crear cliente' });
    expect(fixture.nativeElement.textContent).toContain('Error al crear cliente');
  });

  it('deshabilita el botón de submit cuando isSubmitting es true', () => {
    const { fixture } = createComponent({ isSubmitting: true });
    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });

  it('emite cancel al hacer click en cancelar', () => {
    const { fixture, component } = createComponent();
    const cancelSpy = jest.fn();
    component.cancel.subscribe(cancelSpy);

    const cancelButton = fixture.nativeElement.querySelector('button[type="button"]') as HTMLButtonElement;
    cancelButton.click();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('emite submit al enviar el formulario', () => {
    const { fixture, component } = createComponent();
    const submitSpy = jest.fn();
    component.submit.subscribe(submitSpy);

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(submitSpy).toHaveBeenCalled();
  });

  // Regresión: `documentTypesForPersonType` (y `isJuridica`) no reaccionaban
  // al cambiar el radio Natural/Jurídica porque `computed()` leía
  // `FormControl.value` directo en vez de una signal — ver QA F33 2026-09-14.
  it('actualiza las opciones de tipo de documento al cambiar de Natural a Jurídica', () => {
    const { fixture, component } = createComponent();

    expect(component.documentTypesForPersonType().map((d) => d.id)).toEqual(['d1', 'd2']);
    expect(component.isJuridica()).toBe(false);

    component.form().get('personType')?.setValue(ClientPersonType.JURIDICA);
    fixture.detectChanges();

    expect(component.documentTypesForPersonType().map((d) => d.id)).toEqual(['d2', 'd3']);
    expect(component.isJuridica()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Razón social');
  });
});
