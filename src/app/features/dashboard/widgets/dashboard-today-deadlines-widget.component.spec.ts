import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardTodayDeadlinesWidgetComponent } from './dashboard-today-deadlines-widget.component';
import { DeadlineResponse } from '../../../core/models/deadline.model';

describe('DashboardTodayDeadlinesWidgetComponent (F32 PR1)', () => {
  const deadline: DeadlineResponse = {
    id: 'd1',
    title: 'Audiencia preliminar',
    dueAt: new Date().toISOString(),
    status: 'PENDING',
    type: null,
    process: { id: 'p1', title: 'Proceso Uno' },
  } as unknown as DeadlineResponse;

  function createComponent(deadlines: DeadlineResponse[] = [], isLoading = false) {
    const fixture = TestBed.createComponent(DashboardTodayDeadlinesWidgetComponent);
    fixture.componentRef.setInput('deadlines', deadlines);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardTodayDeadlinesWidgetComponent],
      providers: [provideRouter([])],
    });
  });

  it('muestra el estado vacío cuando no hay plazos hoy', () => {
    const { fixture } = createComponent([], false);

    expect(fixture.nativeElement.textContent).toContain('No tienes plazos ni audiencias programadas para hoy.');
  });

  it('lista los plazos recibidos', () => {
    const { fixture } = createComponent([deadline], false);

    expect(fixture.nativeElement.textContent).toContain('Audiencia preliminar');
    expect(fixture.nativeElement.textContent).toContain('Proceso Uno');
  });

  it('muestra el esqueleto de carga cuando isLoading es true', () => {
    const { fixture } = createComponent([], true);

    expect(fixture.nativeElement.textContent).not.toContain('No tienes plazos');
  });
});
