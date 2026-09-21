import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { ProcessFormComponent } from './process-form.component';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { ClientResponse } from '../../../core/models/client-backend.model';

describe('ProcessFormComponent', () => {
  const fb = new FormBuilder();

  // F40 Ola 4a: el formulario se recortó a los campos esenciales para abrir
  // el expediente (ver "Ola 4 (revisada)" en F40-ajustes-procesos-piloto.md)
  // — ya no incluye description/matterId/court/caseNumber/startDate/endDate
  // (se completan después en la pestaña "Datos" de ProcessDetailComponent).
  function buildForm(advisorIds: string[] = []) {
    return fb.nonNullable.group({
      title: ['', [Validators.required]],
      clientId: ['', [Validators.required]],
      advisorIds: [advisorIds],
      status: ['DRAFT'],
      stageId: ['', [Validators.required]],
      riskLevelId: ['', [Validators.required]],
      processTypeId: [''],
    });
  }

  const advisor: AdvisorResponse = {
    id: 'adv1',
    userId: 'u1',
    specialties: [],
    phone: null,
    professionalCard: null,
    mobileSecondary: null,
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

    const searchInput: HTMLInputElement = fixture.nativeElement.querySelector(
      'app-multi-select input[type="text"]',
    );
    searchInput.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type="checkbox"]');
    checkbox.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith(['adv1']);
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

  it('muestra el mensaje de error cuando errorMessage está presente', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('errorMessage', 'Completa los campos obligatorios.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Completa los campos obligatorios.');
  });

  it('muestra el título "Registrar nuevo proceso" (formulario ahora es solo de creación)', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('clients', [client]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Registrar nuevo proceso');
  });

  // F40 Ola 4a: asunto, descripción, juzgado, radicado y fechas se difieren
  // a la pestaña "Datos" del detalle — ya no viven en este formulario.
  it('ya no incluye los campos diferidos a la pestaña "Datos" del detalle', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select[formcontrolname="matterId"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="court"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="caseNumber"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="startDate"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="endDate"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('textarea[formcontrolname="description"]')).toBeNull();
  });

  // F40 §PRO-03: las etapas visibles se filtran por el tipo de proceso
  // elegido en el mismo formulario — null en processTypeScope = aplica a
  // cualquier tipo.
  describe('filteredStages (F40 §PRO-03)', () => {
    const stageJudicial = {
      id: 'stage-jud',
      catalogType: 'process_stage' as const,
      code: 'AUDIENCIA',
      label: 'Audiencia',
      color: null,
      sortOrder: 1,
      isActive: true,
      isSystem: false,
      personTypeScope: null,
      processTypeScope: 'type-judicial',
    };
    const stageCualquiera = {
      ...stageJudicial,
      id: 'stage-any',
      code: 'INVESTIGACION',
      label: 'Investigación',
      processTypeScope: null,
    };

    it('incluye las etapas sin scope y las que coinciden con el tipo seleccionado', () => {
      const fixture = createComponent();
      const form = buildForm();
      form.patchValue({ processTypeId: 'type-judicial' });
      fixture.componentRef.setInput('form', form);
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('stages', [stageJudicial, stageCualquiera]);
      fixture.detectChanges();

      expect(fixture.componentInstance.filteredStages().map((s) => s.id)).toEqual([
        'stage-jud',
        'stage-any',
      ]);
    });

    it('excluye una etapa de otro tipo cuando no está seleccionada', () => {
      const fixture = createComponent();
      const form = buildForm();
      form.patchValue({ processTypeId: 'type-administrativo' });
      fixture.componentRef.setInput('form', form);
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('stages', [stageJudicial, stageCualquiera]);
      fixture.detectChanges();

      expect(fixture.componentInstance.filteredStages().map((s) => s.id)).toEqual([
        'stage-any',
      ]);
    });

    it('nunca retira la etapa ya seleccionada aunque quede fuera de alcance, y avisa sin bloquear', () => {
      const fixture = createComponent();
      const form = buildForm();
      form.patchValue({ processTypeId: 'type-administrativo', stageId: 'stage-jud' });
      fixture.componentRef.setInput('form', form);
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('stages', [stageJudicial, stageCualquiera]);
      fixture.detectChanges();

      expect(fixture.componentInstance.filteredStages().map((s) => s.id)).toEqual([
        'stage-any',
        'stage-jud',
      ]);
      expect(fixture.componentInstance.isSelectedStageOutOfScope()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain(
        'Esta etapa no está configurada para el tipo de proceso seleccionado.',
      );
      const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitBtn.disabled).toBe(false);
    });
  });

  // F40 §PRO-04: selector de tipo de proceso — ahora esencial en creación
  // (ver "Campos esenciales para la creación" en F40-ajustes-procesos-piloto.md).
  it('renderiza las opciones de processTypes() en el selector de tipo de proceso', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('processTypes', [
      {
        id: 'type-judicial',
        catalogType: 'process_type' as const,
        code: 'JUDICIAL',
        label: 'Judicial',
        color: null,
        sortOrder: 1,
        isActive: true,
        isSystem: true,
        personTypeScope: null,
        processTypeScope: null,
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Judicial');
    expect(fixture.nativeElement.textContent).toContain('Seleccionar tipo');
  });
});
