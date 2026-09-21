import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { ProcessFormComponent } from './process-form.component';
import { ProcessStatus } from '../../../core/models/legal-process.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { ClientResponse, ClientMatterResponse, ClientMatterStatus } from '../../../core/models/client-backend.model';

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
      matterId: [''],
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

  const matterVigente: ClientMatterResponse = {
    id: 'm1',
    clientId: 'cl1',
    contractType: null,
    name: 'Asesoría permanente',
    description: null,
    startDate: null,
    endDate: null,
    status: ClientMatterStatus.VIGENTE,
    processCount: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  const matterVencido: ClientMatterResponse = {
    ...matterVigente,
    id: 'm2',
    name: 'Litigio vencido',
    status: ClientMatterStatus.VENCIDO,
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
    // input[type="text"] (Título, Juzgado o entidad, etc.) — sin el scope,
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

  // F40 §PRO-06: el botón "Generar número automático" se retiró (generaba
  // un valor falso con Date.now() sobre el mismo campo que ahora es el
  // radicado real). El código interno de verdad lo genera el backend y
  // este componente solo lo muestra de solo lectura.
  it('ya no ofrece el generador falso de número de caso', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('button[title="Generar número automático"]'),
    ).toBeNull();
    expect((fixture.componentInstance as any).generateCaseNumber).toBeUndefined();
  });

  it('no muestra el código interno al crear (aún no existe)', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isEditing', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Código interno');
  });

  it('muestra el código interno de solo lectura al editar', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isEditing', true);
    fixture.componentRef.setInput('internalCode', 'RGJ-000042');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Código interno');
    expect(fixture.nativeElement.textContent).toContain('RGJ-000042');
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

  // F34 §3: selector de asunto + advertencia no bloqueante para asuntos
  // vencidos + aviso de clasificación pendiente en procesos existentes.
  it('selectedMatter refleja el asunto seleccionado por matterId', () => {
    const fixture = createComponent();
    const form = buildForm();
    form.patchValue({ matterId: 'm2' });
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('matters', [matterVigente, matterVencido]);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedMatter()).toEqual(matterVencido);
  });

  it('muestra advertencia no bloqueante cuando el asunto seleccionado está vencido', () => {
    const fixture = createComponent();
    const form = buildForm();
    form.patchValue({ matterId: 'm2' });
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('matters', [matterVigente, matterVencido]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Este asunto está vencido');
    // No bloquea el envío — el botón sigue habilitado.
    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(false);
  });

  // BUG QA 2026-09-17 (F34): asunto eliminado (soft delete) pero la
  // referencia se conserva en el proceso — aviso no bloqueante, nunca el de
  // "vencido" (isDeleted se revisa primero en la cadena @if/@else if).
  it('muestra aviso no bloqueante cuando el asunto seleccionado fue eliminado', () => {
    const matterEliminado: ClientMatterResponse = {
      ...matterVigente,
      id: 'm3',
      name: 'Asunto eliminado',
      isDeleted: true,
    };
    const fixture = createComponent();
    const form = buildForm();
    form.patchValue({ matterId: 'm3' });
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('matters', [matterVigente, matterEliminado]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Este asunto fue eliminado. Se mantiene la referencia en el proceso.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Este asunto está vencido');
    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(false);
  });

  it('muestra aviso de clasificación pendiente en un proceso existente sin asunto', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isEditing', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Clasificación pendiente');
  });

  it('emite clientChange solo ante la interacción real del usuario con el select de cliente', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('clients', [client]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.clientChange.subscribe(spy);

    const clientSelect: HTMLSelectElement = fixture.nativeElement.querySelector(
      'select[formcontrolname="clientId"]',
    );
    clientSelect.value = 'cl1';
    clientSelect.dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith('cl1');
  });

  // F40 §PRO-01: la etiqueta visible cambió, el formControlName ("court")
  // se mantiene igual (ver F40.md).
  it('muestra la etiqueta "Juzgado o entidad" en vez de "Corte / Jurisdicción" (PRO-01)', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Juzgado o entidad');
    expect(fixture.nativeElement.textContent).not.toContain('Corte / Jurisdicción');
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

  // F40 §PRO-04: selector de tipo de proceso — opcional, catálogo `process_type`.
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
    expect(fixture.nativeElement.textContent).toContain('Sin clasificar');
  });
});
