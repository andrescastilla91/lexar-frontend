import { TestBed } from '@angular/core/testing';
import { ProcessDeadlinesListComponent } from './process-deadlines-list.component';
import { DeadlineComputationType, DeadlineResponse, DeadlineStatus } from '../../../core/models/deadline.model';

describe('ProcessDeadlinesListComponent', () => {
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
      scope: null,
      blocksAgenda: false,
      durationMinutes: null,
      computationType: DeadlineComputationType.BUSINESS_DAYS,
      needsReview: false,
      createdBy: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  function createComponent() {
    return TestBed.createComponent(ProcessDeadlinesListComponent);
  }

  it('muestra el spinner mientras isLoading es true', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.animate-spin')).not.toBeNull();
  });

  it('muestra el mensaje vacío cuando no hay plazos registrados', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('deadlines', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay plazos registrados para este proceso');
  });

  it('muestra el conteo y los plazos registrados', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('deadlines', [buildDeadline()]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Plazos y audiencias (1)');
    expect(fixture.nativeElement.textContent).toContain('Audiencia inicial');
  });

  it('muestra el botón de completar solo para plazos PENDING', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('deadlines', [buildDeadline({ status: DeadlineStatus.DONE })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[title="Marcar como completado"]')).toBeNull();
  });

  it('emite markDone con el plazo al hacer clic en completar', () => {
    const fixture = createComponent();
    const deadline = buildDeadline();
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
    fixture.componentRef.setInput('deadlines', [deadline]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.deleteDeadline.subscribe(spy);
    fixture.nativeElement.querySelector('button[title="Eliminar plazo"]').click();

    expect(spy).toHaveBeenCalledWith(deadline);
  });

  it('no muestra el botón "Editar" por fila si canEdit es false', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('deadlines', [buildDeadline()]);
    fixture.componentRef.setInput('canEdit', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[title="Editar plazo"]')).toBeNull();
  });

  it('emite edit con el plazo al hacer clic en "Editar" cuando canEdit es true', () => {
    const fixture = createComponent();
    const deadline = buildDeadline();
    fixture.componentRef.setInput('deadlines', [deadline]);
    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.edit.subscribe(spy);
    fixture.nativeElement.querySelector('button[title="Editar plazo"]').click();

    expect(spy).toHaveBeenCalledWith(deadline);
  });

  it('emite create al hacer clic en "+ Nuevo plazo"', () => {
    const fixture = createComponent();
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.create.subscribe(spy);
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === '+ Nuevo plazo')!.click();

    expect(spy).toHaveBeenCalled();
  });
});
