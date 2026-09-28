import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
      processType: null, // F40 §PRO-04
      contingency: null, // F40 §PRO-08 (ola 4b)
      amount: null,
      currency: null,
      court: null,
      caseNumber: 'PROC-2026-000001',
      internalCode: 'RGJ-000001',
      nextHearingDate: null,
      startDate: null,
      endDate: null,
      companyId: 'c1',
      clientId: 'cl1',
      client: { id: 'cl1', fullName: 'Cliente Uno', email: 'cliente@lexar.com' },
      advisors: [],
      matterId: null,
      matter: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      ...overrides,
    };
  }

  function createComponent() {
    TestBed.configureTestingModule({
      imports: [ProcessesTableComponent],
      providers: [provideRouter([])],
    });
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

  // F40 §PRO-04
  it('muestra "Sin clasificar" cuando el proceso no tiene tipo asignado', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [buildProcess({ processType: null })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin clasificar');
  });

  it('muestra la etiqueta del tipo de proceso cuando está asignado', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [
      buildProcess({
        processType: { id: 'type-1', code: 'JUDICIAL', label: 'Judicial', color: null },
      }),
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Judicial');
  });

  // F40 Ola 4a: el título navega a la ficha de detalle en vez de abrir un modal de edición.
  it('el título del proceso enlaza a /procesos/:id', () => {
    const fixture = createComponent();
    const process = buildProcess();
    fixture.componentRef.setInput('processes', [process]);
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href="/procesos/p1"]');
    expect(link).not.toBeNull();
    expect(link.textContent).toContain('Proceso de prueba');
  });

  it('el botón "Ver detalle" también enlaza a /procesos/:id', () => {
    const fixture = createComponent();
    const process = buildProcess();
    fixture.componentRef.setInput('processes', [process]);
    fixture.detectChanges();

    const links: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a[href="/procesos/p1"]'),
    );
    // Uno en la tarjeta de escritorio (ícono) y otro en la de mobile ("Ver detalle").
    expect(links.length).toBeGreaterThanOrEqual(2);
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

  // BUG-24: el bloque de escritorio ya no coexiste sin filtro con el de
  // mobile — ahora lleva `hidden md:block`, simétrico al `md:hidden` del
  // bloque mobile, evitando que ambos rendericen acciones a la vez.
  it('BUG-24: el bloque de tarjetas de escritorio tiene la clase de visibilidad responsive que faltaba', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [buildProcess()]);
    fixture.detectChanges();

    const desktopBlock: HTMLElement = fixture.nativeElement.querySelector('.space-y-4');
    expect(desktopBlock).not.toBeNull();
    expect(desktopBlock.classList.contains('hidden')).toBe(true);
    expect(desktopBlock.classList.contains('md:block')).toBe(true);

    const mobileBlock: HTMLElement = fixture.nativeElement.querySelector('.grid.gap-4.md\\:hidden');
    expect(mobileBlock).not.toBeNull();
  });

  it('muestra "Sin asesores asignados" cuando el proceso no tiene asesores', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [buildProcess({ advisors: [] })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin asesores asignados');
  });

  it('F36: sin hasFullAccess muestra el texto explicativo de alcance', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [buildProcess()]);
    fixture.componentRef.setInput('hasFullAccess', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ves los procesos a tu cargo.');
  });

  it('F36: con hasFullAccess no muestra el texto explicativo de alcance', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('processes', [buildProcess()]);
    fixture.componentRef.setInput('hasFullAccess', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Ves los procesos a tu cargo.');
  });
});
