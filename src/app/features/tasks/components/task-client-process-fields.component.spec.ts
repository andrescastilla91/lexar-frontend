import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { TaskClientProcessFieldsComponent } from './task-client-process-fields.component';
import { LegalProcessResponse } from '../../../core/models/legal-process.model';
import { ClientResponse } from '../../../core/models/client-backend.model';

function buildProcess(overrides: Partial<LegalProcessResponse> = {}): LegalProcessResponse {
  return {
    id: 'p1',
    title: 'Proceso Ríos',
    caseNumber: '11001-31-03-001',
    internalCode: 'RGJ-000001',
    stage: { id: 's1', code: 'INVESTIGATION', label: 'Instrucción', color: null },
    clientId: 'c1',
    client: { id: 'c1', fullName: 'Ana Ríos', email: 'ana@x.com' },
    ...overrides,
  } as unknown as LegalProcessResponse;
}

const CLIENTS = [
  { id: 'c1', fullName: 'Ana Ríos' },
  { id: 'c2', fullName: 'Luis Pérez' },
] as unknown as ClientResponse[];

describe('TaskClientProcessFieldsComponent', () => {
  function setup(processes: LegalProcessResponse[] = [buildProcess()], clients = CLIENTS) {
    const fb = TestBed.inject(FormBuilder);
    const form = fb.nonNullable.group({ processId: [''], clientId: [''] });
    const fixture = TestBed.createComponent(TaskClientProcessFieldsComponent);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('processes', processes);
    fixture.componentRef.setInput('clients', clients);
    fixture.detectChanges();
    return { fixture, form, el: fixture.nativeElement as HTMLElement };
  }

  it('sin proceso, el cliente se puede elegir libremente', () => {
    const { form, fixture } = setup();

    expect(form.controls.clientId.disabled).toBe(false);
    form.controls.clientId.setValue('c2');
    fixture.detectChanges();

    expect(form.controls.clientId.value).toBe('c2');
    expect(fixture.nativeElement.querySelector('app-task-process-summary')).toBeNull();
  });

  it('al elegir proceso, el cliente se autocompleta, se bloquea y aparece el resumen', () => {
    const { form, fixture, el } = setup();

    form.controls.processId.setValue('p1');
    fixture.detectChanges();

    expect(form.controls.clientId.value).toBe('c1');
    expect(form.controls.clientId.disabled).toBe(true);
    expect(el.querySelector('app-task-process-summary')).not.toBeNull();
    expect(el.textContent).toContain('Instrucción');
    expect(el.textContent).toContain('11001-31-03-001');
    expect(el.textContent).toContain('Lo define el proceso seleccionado');
  });

  it('al quitar el proceso, el cliente se desbloquea y se limpia', () => {
    const { form, fixture, el } = setup();
    form.controls.processId.setValue('p1');
    fixture.detectChanges();

    form.controls.processId.setValue('');
    fixture.detectChanges();

    expect(form.controls.clientId.disabled).toBe(false);
    expect(form.controls.clientId.value).toBe('');
    expect(el.querySelector('app-task-process-summary')).toBeNull();
  });

  it('si el cliente del proceso no está en la lista cargada, igual se ofrece como opción', () => {
    const outside = buildProcess({
      id: 'p9',
      clientId: 'c99',
      client: { id: 'c99', fullName: 'Cliente fuera de la página', email: 'x@x.com' },
    });
    const { form, fixture } = setup([outside]);

    form.controls.processId.setValue('p9');
    fixture.detectChanges();

    const labels = fixture.componentInstance.clientOptions().map((o) => o.label);
    expect(labels).toContain('Cliente fuera de la página');
    expect(form.controls.clientId.value).toBe('c99');
  });

  it('cambiar de un proceso a otro actualiza el cliente al del nuevo proceso', () => {
    const second = buildProcess({
      id: 'p2',
      clientId: 'c2',
      client: { id: 'c2', fullName: 'Luis Pérez', email: 'l@x.com' },
    });
    const { form, fixture } = setup([buildProcess(), second]);

    form.controls.processId.setValue('p1');
    fixture.detectChanges();
    form.controls.processId.setValue('p2');
    fixture.detectChanges();

    expect(form.controls.clientId.value).toBe('c2');
  });
});
