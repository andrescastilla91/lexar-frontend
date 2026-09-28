import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormBuilder, Validators } from '@angular/forms';
import { DeadlineFormModalComponent } from './deadline-form-modal.component';
import { MultiSelectComponent } from '../multi-select/multi-select.component';
import { DeadlineScope } from '../../../core/models/deadline.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { AssignableUser } from '../../../core/models/user-backend.model';
import { LegalProcessResponse } from '../../../core/models/legal-process.model';

describe('DeadlineFormModalComponent', () => {
  function createGeneralForm() {
    const fb = TestBed.inject(FormBuilder);
    return fb.nonNullable.group({
      processId: [''],
      title: ['', [Validators.required]],
      typeId: ['', [Validators.required]],
      dueAt: ['', [Validators.required]],
      allDay: [false],
      scope: [DeadlineScope.ONLY_ME],
      blocksAgenda: [false],
      assigneeUserIds: [[] as string[]],
    });
  }

  function createEmbeddedForm() {
    const fb = TestBed.inject(FormBuilder);
    return fb.nonNullable.group({
      title: ['', [Validators.required]],
      typeId: ['', [Validators.required]],
      dueAt: ['', [Validators.required]],
      allDay: [false],
      assigneeUserIds: [[] as string[]],
    });
  }

  function createComponent(form = createGeneralForm(), showProcessField = true) {
    const fixture = TestBed.createComponent(DeadlineFormModalComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('showProcessField', showProcessField);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, form };
  }

  const advisors: AdvisorResponse[] = [
    {
      id: 'adv-1',
      user: { id: 'user-1', firstName: 'Ana', lastName: 'García', email: 'ana@lexar.com' },
    } as AdvisorResponse,
    {
      id: 'adv-2',
      user: { id: 'user-2', firstName: 'Carlos', lastName: 'Pérez', email: 'carlos@lexar.com' },
    } as AdvisorResponse,
  ];

  const assignableUsers: AssignableUser[] = [
    { id: 'user-3', firstName: 'Lucía', lastName: 'Restrepo', email: 'lucia@lexar.com' },
  ];

  const processes: LegalProcessResponse[] = [
    { id: 'proc-1', title: 'Proceso demo' } as LegalProcessResponse,
  ];

  it('no renderiza el formulario cuando isOpen es false', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('en contexto general (Calendario) muestra el selector de Proceso', () => {
    const { fixture } = createComponent(createGeneralForm(), true);

    expect(fixture.nativeElement.querySelector('select[formcontrolname="processId"]')).not.toBeNull();
  });

  it('en contexto embebido (pestaña Plazos de un Proceso) NO muestra el selector de Proceso, ni falla al leerlo', () => {
    const { fixture, component } = createComponent(createEmbeddedForm(), false);

    expect(fixture.nativeElement.querySelector('select[formcontrolname="processId"]')).toBeNull();
    expect(component['selectedProcessId']()).toBe('');
  });

  it('la sección Asignación siempre está presente — con o sin proceso seleccionado — nunca aparece ni desaparece', () => {
    const { fixture, form } = createComponent(createGeneralForm(), true);
    expect(fixture.nativeElement.textContent).toContain('Asignación');

    form.patchValue({ processId: 'proc-1' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Asignación');
  });

  it('sin proceso y alcance ONLY_ME: no ofrece selector de asistentes', () => {
    const { fixture } = createComponent(createGeneralForm(), true);

    expect(fixture.nativeElement.textContent).toContain('Este evento queda asignado solo a ti.');
    expect(fixture.nativeElement.querySelector('app-multi-select')).toBeNull();
  });

  it('sin proceso y alcance SELECTED: ofrece multi-select con usuarios asignables de la empresa', () => {
    const { fixture, form, component } = createComponent(createGeneralForm(), true);
    fixture.componentRef.setInput('assignableUsers', assignableUsers);
    form.patchValue({ scope: DeadlineScope.SELECTED });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-multi-select')).not.toBeNull();
    expect(component['assignmentItems']()).toEqual([{ id: 'user-3', label: 'Lucía Restrepo' }]);
  });

  it('sin proceso y alcance TEAM: avisa que no aplica seleccionar asistentes puntuales', () => {
    const { fixture, form } = createComponent(createGeneralForm(), true);
    fixture.componentRef.setInput('canCreateTeamScope', true);
    form.patchValue({ scope: DeadlineScope.TEAM });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no aplica seleccionar asistentes puntuales');
    expect(fixture.nativeElement.querySelector('app-multi-select')).toBeNull();
  });

  it('la opción "todo el equipo" solo aparece si canCreateTeamScope es true', () => {
    const { fixture } = createComponent(createGeneralForm(), true);
    const options = () => Array.from(fixture.nativeElement.querySelectorAll('select[formcontrolname="scope"] option')) as HTMLOptionElement[];

    expect(options().some((o) => o.textContent?.includes('todo el equipo'))).toBe(false);

    fixture.componentRef.setInput('canCreateTeamScope', true);
    fixture.detectChanges();
    expect(options().some((o) => o.textContent?.includes('todo el equipo'))).toBe(true);
  });

  it('con proceso elegido en Calendario: muestra asesores priorizando los relacionados al proceso', () => {
    const { fixture, form, component } = createComponent(createGeneralForm(), true);
    fixture.componentRef.setInput('advisors', advisors);
    fixture.componentRef.setInput('relatedAdvisorUserIds', ['user-2']);
    form.patchValue({ processId: 'proc-1' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-multi-select')).not.toBeNull();
    expect(component['assignmentItems']()).toEqual([
      { id: 'user-2', label: 'Carlos Pérez', description: 'Asesor del proceso' },
      { id: 'user-1', label: 'Ana García' },
    ]);
  });

  it('en contexto embebido (proceso fijo): muestra directamente los asesores, sin selector de Alcance', () => {
    const { fixture, component } = createComponent(createEmbeddedForm(), false);
    fixture.componentRef.setInput('advisors', advisors);
    fixture.componentRef.setInput('relatedAdvisorUserIds', ['user-1', 'user-2']);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select[formcontrolname="scope"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-multi-select')).not.toBeNull();
    expect(component['assignmentItems']().map((i) => i.id)).toEqual(['user-1', 'user-2']);
  });

  it('cambia el título y el texto del botón según haya o no proceso', () => {
    const { fixture, form } = createComponent(createGeneralForm(), true);
    expect(fixture.nativeElement.textContent).toContain('Nuevo evento general');
    expect(fixture.nativeElement.textContent).toContain('Crear evento');

    form.patchValue({ processId: 'proc-1' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nuevo plazo o audiencia');
    expect(fixture.nativeElement.textContent).toContain('Crear plazo');
  });

  it('en contexto embebido siempre dice "Nuevo plazo" / "Crear plazo"', () => {
    const { fixture } = createComponent(createEmbeddedForm(), false);

    expect(fixture.nativeElement.textContent).toContain('Nuevo plazo');
    expect(fixture.nativeElement.textContent).toContain('Crear plazo');
  });

  it('renderiza las opciones de Proceso recibidas', () => {
    const { fixture } = createComponent(createGeneralForm(), true);
    fixture.componentRef.setInput('processes', processes);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Proceso demo');
  });

  it('emite formCancel al hacer click en Cancelar', () => {
    const { fixture, component } = createComponent();
    const spy = jest.fn();
    component.formCancel.subscribe(spy);

    const cancelButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Cancelar',
    ) as HTMLButtonElement;
    cancelButton.click();

    expect(spy).toHaveBeenCalled();
  });

  it('emite formSubmit al enviar el formulario', () => {
    const { fixture, component } = createComponent();
    const spy = jest.fn();
    component.formSubmit.subscribe(spy);

    const formEl: HTMLFormElement = fixture.nativeElement.querySelector('form');
    formEl.dispatchEvent(new Event('submit'));

    expect(spy).toHaveBeenCalled();
  });

  it('emite assigneesChange desde el multi-select', () => {
    const { fixture, form, component } = createComponent(createGeneralForm(), true);
    fixture.componentRef.setInput('assignableUsers', assignableUsers);
    form.patchValue({ scope: DeadlineScope.SELECTED });
    fixture.detectChanges();
    const spy = jest.fn();
    component.assigneesChange.subscribe(spy);

    const multiSelect = fixture.debugElement.query(By.directive(MultiSelectComponent))
      .componentInstance as MultiSelectComponent;
    multiSelect.toggle('user-3');

    expect(spy).toHaveBeenCalledWith(['user-3']);
  });

  it('muestra el mensaje de error cuando errorMessage tiene contenido', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('errorMessage', 'Completa los campos obligatorios.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Completa los campos obligatorios.');
  });

  it('deshabilita el botón de envío cuando el formulario es inválido o isSubmitting es true', () => {
    const { fixture, form } = createComponent(createGeneralForm(), true);
    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitButton.disabled).toBe(true);

    form.patchValue({ title: 'Audiencia', typeId: 'type-1', dueAt: '2026-10-01T10:00' });
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(false);

    fixture.componentRef.setInput('isSubmitting', true);
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(true);
  });
});
