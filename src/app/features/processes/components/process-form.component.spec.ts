import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { ProcessFormComponent } from './process-form.component';
import { ProcessStatus } from '../../../core/models/legal-process.model';
import { AdvisorResponse, AdvisorStatus } from '../../../core/models/advisor-backend.model';
import { ClientResponse } from '../../../core/models/client-backend.model';

describe('ProcessFormComponent', () => {
  const fb = new FormBuilder();

  function buildForm(advisorIds: string[] = []) {
    return fb.nonNullable.group({
      title: ['', [Validators.required]],
      description: [''],
      clientId: ['', [Validators.required]],
      advisorIds: [advisorIds],
      status: [ProcessStatus.DRAFT],
      stageId: [''],
      riskLevelId: [''],
      court: [''],
      caseNumber: [''],
      startDate: [''],
      endDate: [''],
    });
  }

  const advisor: AdvisorResponse = {
    id: 'adv1',
    userId: 'u1',
    specialty: null,
    phone: null,
    status: AdvisorStatus.AVAILABLE,
    rating: null,
    experienceYears: 3,
    isActive: true,
    companyId: 'c1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' },
  };

  const client: ClientResponse = {
    id: 'cl1',
    fullName: 'Cliente Uno',
    companyName: null,
    phone: null,
    email: 'cliente@lexar.com',
    address: null,
    documentType: null,
    identificationNumber: '123',
    riskLevel: null,
    isActive: true,
    assignedAdvisor: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  function createComponent() {
    return TestBed.createComponent(ProcessFormComponent);
  }

  it('no renderiza nada cuando isOpen es false', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('selectedAdvisorIds refleja el valor actual del control advisorIds (BUG-06: input de MultiSelectComponent)', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm(['adv1']));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.selectedAdvisorIds()).toEqual(['adv1']);
  });

  it('advisorItems traduce AdvisorResponse a MultiSelectItem (nombre completo + especialidad)', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('advisors', [advisor]);
    fixture.detectChanges();

    expect(fixture.componentInstance.advisorItems()).toEqual([
      { id: 'adv1', label: 'Ana Gómez', description: 'N/A' },
    ]);
  });

  it('emite advisorIdsChange (BUG-06: reemplaza a toggleAdvisor) al marcar el checkbox de un asesor en MultiSelectComponent', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('advisors', [advisor]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.advisorIdsChange.subscribe(spy);

    // MultiSelectComponent (ajuste 2026-09-03) solo renderiza el listbox
    // cuando el input de búsqueda tiene foco — igual que un <select>. Se
    // escopa a "app-multi-select" porque el formulario tiene varios
    // input[type="text"] (Título, Corte/Jurisdicción, etc.) — sin el scope,
    // querySelector encuentra el de "Título del proceso" en su lugar.
    const searchInput: HTMLInputElement = fixture.nativeElement.querySelector(
      'app-multi-select input[type="text"]',
    );
    searchInput.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type="checkbox"]');
    checkbox.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith(['adv1']);
  });

  it('emite generateCaseNumber al hacer clic en el botón de generar', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.generateCaseNumber.subscribe(spy);

    fixture.nativeElement.querySelector('button[title="Generar número automático"]').click();

    expect(spy).toHaveBeenCalled();
  });

  it('emite close al hacer clic en cancelar', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.close.subscribe(spy);

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const cancelBtn = buttons.find((b) => b.textContent?.trim() === 'Cancelar');
    cancelBtn!.click();

    expect(spy).toHaveBeenCalled();
  });

  it('emite submit al enviar el formulario', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.submit.subscribe(spy);

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(spy).toHaveBeenCalled();
  });

  it('deshabilita el botón de guardar cuando isSubmitting es true', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
  });

  it('deshabilita el botón de guardar cuando canEdit es false', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('canEdit', false);
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
  });

  it('muestra el mensaje de error cuando errorMessage está presente', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('errorMessage', 'Completa los campos obligatorios.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Completa los campos obligatorios.');
  });

  it('muestra el título de edición cuando isEditing es true', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isEditing', true);
    fixture.componentRef.setInput('clients', [client]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Editar proceso');
  });
});
