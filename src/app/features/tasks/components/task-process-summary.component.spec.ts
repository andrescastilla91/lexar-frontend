import { TestBed } from '@angular/core/testing';
import { TaskProcessSummaryComponent } from './task-process-summary.component';

describe('TaskProcessSummaryComponent', () => {
  function create(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(TaskProcessSummaryComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra cliente, etapa, radicado y código interno', () => {
    const el = create({
      clientName: 'Ana Ríos',
      stage: 'Instrucción',
      caseNumber: '11001-31-03-001',
      internalCode: 'RGJ-000001',
    });

    expect(el.textContent).toContain('Ana Ríos');
    expect(el.textContent).toContain('Instrucción');
    expect(el.textContent).toContain('11001-31-03-001');
    expect(el.textContent).toContain('RGJ-000001');
  });

  it('con datos vacíos muestra textos de respaldo en vez de espacios en blanco', () => {
    const el = create({ internalCode: 'RGJ-000002' });

    expect(el.textContent).toContain('Sin cliente');
    expect(el.textContent).toContain('Sin etapa');
    expect(el.textContent).toContain('Sin radicado');
  });
});
