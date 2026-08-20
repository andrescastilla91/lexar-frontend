import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { AdvisorFormComponent } from './advisor-form.component';
import { AdvisorStatus } from '../../../core/models/advisor-backend.model';
import { UserBackend } from '../../../core/models/user-backend.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';

function buildForm() {
  const fb = new FormBuilder();
  return fb.nonNullable.group({
    userId: ['', [Validators.required]],
    phone: [''],
    specialtyId: ['', [Validators.required]],
    status: [AdvisorStatus.AVAILABLE, Validators.required],
    experienceYears: [0, [Validators.required, Validators.min(0)]],
    rating: [0, [Validators.min(0), Validators.max(5)]],
  });
}

const users: UserBackend[] = [
  {
    id: 'u1',
    firstName: 'Ana',
    lastName: 'Gómez',
    email: 'ana@lexar.com',
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-01-01',
    twoFactorEnabled: true,
    roles: [],
  },
];

const specialties: CatalogItem[] = [
  { id: 's1', catalogType: 'advisor_specialty', code: 'CIVIL', label: 'Civil', color: null, sortOrder: 0, isActive: true, isSystem: true },
];

describe('AdvisorFormComponent', () => {
  function createComponent(overrides: {
    isOpen?: boolean;
    isEditing?: boolean;
    isSubmitting?: boolean;
    errorMessage?: string | null;
  } = {}) {
    TestBed.configureTestingModule({ imports: [AdvisorFormComponent] });
    const fixture = TestBed.createComponent(AdvisorFormComponent);
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', overrides.isOpen ?? true);
    fixture.componentRef.setInput('isEditing', overrides.isEditing ?? false);
    fixture.componentRef.setInput('isSubmitting', overrides.isSubmitting ?? false);
    fixture.componentRef.setInput('errorMessage', overrides.errorMessage ?? null);
    fixture.componentRef.setInput('availableUsers', users);
    fixture.componentRef.setInput('specialties', specialties);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('no renderiza el formulario cuando isOpen es false', () => {
    const { fixture } = createComponent({ isOpen: false });
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('muestra el título de creación cuando isEditing es false', () => {
    const { fixture } = createComponent({ isEditing: false });
    expect(fixture.nativeElement.textContent).toContain('Registrar nuevo asesor');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').textContent.trim()).toBe('Crear asesor');
  });

  it('muestra el título de edición cuando isEditing es true', () => {
    const { fixture } = createComponent({ isEditing: true });
    expect(fixture.nativeElement.textContent).toContain('Editar asesor');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').textContent.trim()).toBe('Actualizar');
  });

  it('renderiza las opciones de usuarios y especialidades a partir de los inputs', () => {
    const { fixture } = createComponent();
    const selects = fixture.nativeElement.querySelectorAll('select');
    const userOptions = selects[0].querySelectorAll('option');
    const specialtyOptions = selects[1].querySelectorAll('option');

    expect(userOptions.length).toBe(2);
    expect(specialtyOptions.length).toBe(2);
  });

  it('muestra el mensaje de error cuando errorMessage tiene valor', () => {
    const { fixture } = createComponent({ errorMessage: 'Error al crear asesor' });
    expect(fixture.nativeElement.textContent).toContain('Error al crear asesor');
  });

  it('deshabilita el botón de submit cuando isSubmitting es true o el form es inválido', () => {
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
});
