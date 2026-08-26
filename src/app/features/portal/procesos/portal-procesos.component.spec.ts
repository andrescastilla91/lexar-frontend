import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalProcesosComponent } from './portal-procesos.component';
import { PortalProcessesService } from '../../../core/services/portal-processes.service';
import { PortalProcessListItem } from '../../../core/models/portal.model';

describe('PortalProcesosComponent', () => {
  let portalProcessesServiceMock: { findProcesses: jest.Mock };

  const processes: PortalProcessListItem[] = [
    {
      id: 'p1',
      title: 'Proceso 1',
      status: 'ACTIVE',
      statusLabel: 'Activo',
      stage: 'Demanda',
      court: 'Juzgado 1',
      caseNumber: 'PROC-1',
      nextHearingDate: null,
      advisors: [{ name: 'Ana G' }],
      createdAt: '2026-01-01',
    },
  ];

  function configure() {
    portalProcessesServiceMock = { findProcesses: jest.fn() };

    return TestBed.configureTestingModule({
      imports: [PortalProcesosComponent],
      providers: [
        provideRouter([]),
        { provide: PortalProcessesService, useValue: portalProcessesServiceMock },
      ],
    }).compileComponents();
  }

  function createComponent() {
    const fixture = TestBed.createComponent(PortalProcesosComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('empieza con isLoading en true antes de resolver', async () => {
    await configure();
    portalProcessesServiceMock.findProcesses.mockReturnValue(of(processes));
    const fixture = TestBed.createComponent(PortalProcesosComponent);

    expect(fixture.componentInstance.isLoading()).toBe(true);
  });

  it('en éxito carga los procesos y apaga isLoading', async () => {
    await configure();
    portalProcessesServiceMock.findProcesses.mockReturnValue(of(processes));
    const component = createComponent();

    expect(component.processes()).toEqual(processes);
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('con lista vacía, no hay error y processes queda vacío', async () => {
    await configure();
    portalProcessesServiceMock.findProcesses.mockReturnValue(of([]));
    const component = createComponent();

    expect(component.processes()).toEqual([]);
    expect(component.isLoading()).toBe(false);
  });

  it('en error expone el mensaje y apaga isLoading', async () => {
    await configure();
    portalProcessesServiceMock.findProcesses.mockReturnValue(
      throwError(() => new Error('No se pudieron cargar tus procesos')),
    );
    const component = createComponent();

    expect(component.errorMessage()).toBe('No se pudieron cargar tus procesos');
    expect(component.isLoading()).toBe(false);
  });
});
