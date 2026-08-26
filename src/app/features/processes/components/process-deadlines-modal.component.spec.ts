import { TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { ProcessDeadlinesModalComponent } from './process-deadlines-modal.component';
import { AdvisorResponse, AdvisorStatus } from '../../../core/models/advisor-backend.model';
import { DeadlineResponse, DeadlineStatus } from '../../../core/models/deadline.model';

describe('ProcessDeadlinesModalComponent', () => {
  const fb = new FormBuilder();

  function buildForm(assigneeUserIds: string[] = []) {
    return fb.nonNullable.group({
      title: ['', [Validators.required]],
      typeId: ['', [Validators.required]],
      dueAt: ['', [Validators.required]],
      allDay: [false],
      notes: [''],
      assigneeUserIds: [assigneeUserIds],
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

  function buildDeadline(overrides: Partial<DeadlineResponse> = {}): DeadlineResponse {
    return {
      id: 'd1',
      processId: 'p1',
      process: null,
      title: 'Audiencia inicial',
      type: null,
      dueAt: '2026-02-01T10:00:00.000Z',
      allDay: false,
      notes: null,
      status: DeadlineStatus.PENDING,
      assignees: [],
      createdBy: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  function createComponent() {
    return TestBed.createComponent(ProcessDeadlinesModalComponent);
  }

  it('no renderiza nada cuando isOpen es false', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('isAssigneeSelected refleja el valor actual del control assigneeUserIds', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm(['u1']));
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.isAssigneeSelected('u1')).toBe(true);
    expect(component.isAssigneeSelected('u2')).toBe(false);
  });

  it('emite toggleAssignee al marcar el checkbox de un asesor', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('advisors', [advisor]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.toggleAssignee.subscribe(spy);

    // El primer checkbox de la plantilla es "Todo el día" (allDay); el del
    // asesor es el último, dentro de la lista "Asignar a".
    const checkboxes: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll(
      'input[type="checkbox"]',
    );
    checkboxes[checkboxes.length - 1].dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith('u1');
  });

  it('muestra el spinner mientras isLoading es true', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.animate-spin')).not.toBeNull();
  });

  it('muestra el mensaje vacío cuando no hay plazos registrados', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('deadlines', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay plazos registrados para este proceso');
  });

  it('muestra el botón de completar solo para plazos PENDING', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('deadlines', [buildDeadline({ status: DeadlineStatus.DONE })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[title="Marcar como completado"]')).toBeNull();
  });

  it('emite markDone con el plazo al hacer clic en completar', () => {
    const fixture = createComponent();
    const deadline = buildDeadline();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('deadlines', [deadline]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.markDone.subscribe(spy);

    fixture.nativeElement.querySelector('button[title="Marcar como completado"]').click();

    expect(spy).toHaveBeenCalledWith(deadline);
  });

  it('emite deleteDeadline con el plazo al hacer clic en eliminar', () => {
    const fixture = createComponent();
    const deadline = buildDeadline();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('deadlines', [deadline]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.deleteDeadline.subscribe(spy);

    fixture.nativeElement.querySelector('button[title="Eliminar plazo"]').click();

    expect(spy).toHaveBeenCalledWith(deadline);
  });

  it('deshabilita el botón de crear plazo cuando el formulario es inválido', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
  });

  it('emite submit al enviar el formulario', () => {
    const fixture = createComponent();
    const form = buildForm();
    form.setValue({
      title: 'Audiencia',
      typeId: 'type1',
      dueAt: '2026-02-01T10:00',
      allDay: false,
      notes: '',
      assigneeUserIds: [],
    });
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.submit.subscribe(spy);

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(spy).toHaveBeenCalled();
  });

  it('emite close al hacer clic en cerrar', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('form', buildForm());
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('deadlines', []);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.close.subscribe(spy);

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const closeBtn = buttons.find((b) => b.textContent?.trim() === 'Cerrar');
    closeBtn!.click();

    expect(spy).toHaveBeenCalled();
  });
});
