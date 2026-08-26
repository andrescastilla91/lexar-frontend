import { TestBed } from '@angular/core/testing';
import { ProcessesTableComponent } from './processes-table.component';
import { LegalProcessResponse, ProcessStatus } from '../../../core/models/legal-process.model';

describe('ProcessesTableComponent', () => {
  function buildProcess(overrides: Partial<LegalProcessResponse> = {}): LegalProcessResponse {
    return {
      id: 'p1',
      title: 'Proceso de prueba',
      description: null,
      status: ProcessStatus.DRAFT,
      stage: null,
      riskLevel: null,
      court: null,
      caseNumber: 'PROC-2026-000001',
      nextHearingDate: null,
      startDate: null,
      endDate: null,
      companyId: 'c1',
      clientId: 'cl1',
      client: { id: 'cl1', fullName: 'Cliente Uno', email: 'cliente@lexar.com' },
      advisors: [],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      ...overrides,
    };
  }

  function createComponent() {
    return TestBed.createComponent(ProcessesTableComponent);
  }

  it('muestra el spinner de carga cuando isLoading es true', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', []);
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.animate-spin')).not.toBeNull();
  });

  it('muestra el mensaje de vacío cuando no hay procesos', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', []);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay procesos registrados');
  });

  it('renderiza el título y el cliente de cada proceso', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [buildProcess()]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Proceso de prueba');
    expect(fixture.nativeElement.textContent).toContain('Cliente Uno');
  });

  it('muestra el botón de editar solo cuando el proceso es editable', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [buildProcess({ status: ProcessStatus.COMPLETED })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[title="Editar proceso"]')).toBeNull();
  });

  it('muestra el botón de cambiar estado solo si hay transiciones válidas', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [buildProcess({ status: ProcessStatus.CANCELLED })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[title="Cambiar estado"]')).toBeNull();
  });

  it('muestra el botón de anotar solo cuando el proceso está ACTIVE', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [buildProcess({ status: ProcessStatus.DRAFT })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[title="Agregar anotación"]')).toBeNull();

    fixture.componentRef.setInput('processes', [buildProcess({ status: ProcessStatus.ACTIVE })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[title="Agregar anotación"]')).not.toBeNull();
  });

  it('emite edit con el proceso al hacer clic en editar', () => {
    const fixture = createComponent();
    const process = buildProcess({ status: ProcessStatus.DRAFT });
    fixture.componentRef.setInput('processes', [process]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.edit.subscribe(spy);

    fixture.nativeElement.querySelector('button[title="Editar proceso"]').click();

    expect(spy).toHaveBeenCalledWith(process);
  });

  it('emite delete con el proceso al hacer clic en eliminar', () => {
    const fixture = createComponent();
    const process = buildProcess();
    fixture.componentRef.setInput('processes', [process]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.delete.subscribe(spy);

    fixture.nativeElement.querySelector('button[title="Eliminar proceso"]').click();

    expect(spy).toHaveBeenCalledWith(process);
  });

  it('emite viewHistory, viewDeadlines y viewTasks con el proceso', () => {
    const fixture = createComponent();
    const process = buildProcess();
    fixture.componentRef.setInput('processes', [process]);
    fixture.detectChanges();

    const historySpy = jest.fn();
    const deadlinesSpy = jest.fn();
    const tasksSpy = jest.fn();
    fixture.componentInstance.viewHistory.subscribe(historySpy);
    fixture.componentInstance.viewDeadlines.subscribe(deadlinesSpy);
    fixture.componentInstance.viewTasks.subscribe(tasksSpy);

    fixture.nativeElement.querySelector('button[title="Ver historial"]').click();
    fixture.nativeElement.querySelector('button[title="Ver plazos y audiencias"]').click();
    fixture.nativeElement.querySelector('button[title="Ver tareas"]').click();

    expect(historySpy).toHaveBeenCalledWith(process);
    expect(deadlinesSpy).toHaveBeenCalledWith(process);
    expect(tasksSpy).toHaveBeenCalledWith(process);
  });

  it('muestra "Sin asesores asignados" cuando el proceso no tiene asesores', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [buildProcess({ advisors: [] })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin asesores asignados');
  });
});
