import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LegalAcceptancesComponent } from './legal-acceptances.component';
import { LegalComplianceService } from '../../core/services/legal-compliance.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { LegalAcceptanceRecord } from '../../core/models/legal-compliance.model';
import * as blobUtil from '../../core/utils/blob-download.util';

function buildRecord(overrides: Partial<LegalAcceptanceRecord> = {}): LegalAcceptanceRecord {
  return {
    id: 'acc-1',
    acceptedAt: '2026-10-05T10:00:00.000Z',
    documentType: 'internal_terms',
    documentTypeLabel: 'Términos de uso interno',
    documentVersion: '1.0',
    documentFilename: 'terminos.pdf',
    subjectKind: 'user',
    subjectName: 'María Gómez',
    subjectEmail: 'maria@example.com',
    ip: '190.0.0.1',
    userAgent: 'Mozilla/5.0',
    ...overrides,
  };
}

describe('LegalAcceptancesComponent', () => {
  let serviceMock: { findAcceptances: jest.Mock; exportAcceptances: jest.Mock };
  let toastMock: { error: jest.Mock; success: jest.Mock };

  function configure(hasPermission = true): void {
    serviceMock = {
      findAcceptances: jest.fn().mockReturnValue(
        of({ message: 'ok', acceptances: [buildRecord()], total: 1, page: 1, limit: 20 }),
      ),
      exportAcceptances: jest.fn().mockReturnValue(of(new Blob(['x']))),
    };
    toastMock = { error: jest.fn(), success: jest.fn() };

    TestBed.configureTestingModule({
      imports: [LegalAcceptancesComponent],
      providers: [
        provideRouter([]),
        { provide: LegalComplianceService, useValue: serviceMock },
        { provide: ToastService, useValue: toastMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(hasPermission),
            hasPermission: jest.fn().mockReturnValue(hasPermission),
            userPermissions: signal(hasPermission ? ['audit.view'] : []),
          },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(LegalAcceptancesComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('al inicializar pide la primera página sin filtros', () => {
    configure();
    const { component } = createComponent();

    expect(serviceMock.findAcceptances).toHaveBeenCalledWith(
      { from: undefined, to: undefined, documentType: undefined, subjectKind: undefined, search: undefined },
      1,
      20,
    );
    expect(component.records()).toHaveLength(1);
    expect(component.total()).toBe(1);
  });

  it('pinta documento, versión, aceptante y origen', () => {
    configure();
    const { fixture } = createComponent();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Términos de uso interno');
    expect(text).toContain('Versión 1.0');
    expect(text).toContain('María Gómez');
    expect(text).toContain('Usuario interno');
    expect(text).toContain('maria@example.com');
    expect(text).toContain('190.0.0.1');
  });

  it('distingue a un cliente del portal', () => {
    configure();
    serviceMock.findAcceptances.mockReturnValue(
      of({
        message: 'ok',
        acceptances: [buildRecord({ subjectKind: 'portal', subjectName: 'Cliente Uno', ip: null, userAgent: null })],
        total: 1,
        page: 1,
        limit: 20,
      }),
    );
    const { fixture } = createComponent();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Cliente del portal');
    expect(text).toContain('IP no registrada');
  });

  it('muestra el estado vacío cuando no hay aceptaciones', () => {
    configure();
    serviceMock.findAcceptances.mockReturnValue(
      of({ message: 'ok', acceptances: [], total: 0, page: 1, limit: 20 }),
    );
    const { fixture } = createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No hay aceptaciones registradas con estos filtros.',
    );
  });

  it('cambiar un filtro vuelve a pedir desde la página 1', () => {
    configure();
    const { component } = createComponent();
    serviceMock.findAcceptances.mockClear();

    component.documentType = 'portal_terms';
    component.applyFilters();

    expect(serviceMock.findAcceptances).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: 'portal_terms' }),
      1,
      20,
    );
  });

  it('applyFilters no repite la petición si los filtros no cambiaron', () => {
    configure();
    const { component } = createComponent();
    serviceMock.findAcceptances.mockClear();

    component.applyFilters();

    expect(serviceMock.findAcceptances).not.toHaveBeenCalled();
  });

  it('la búsqueda se recorta y las fechas se envían como ISO (hasta, fin del día)', () => {
    configure();
    const { component } = createComponent();
    serviceMock.findAcceptances.mockClear();

    component.search = '  maria  ';
    component.fromDate = '2026-10-01';
    component.toDate = '2026-10-05';
    component.applyFilters();

    const filters = serviceMock.findAcceptances.mock.calls[0][0] as { search: string; from: string; to: string };
    expect(filters.search).toBe('maria');
    expect(new Date(filters.from).getTime()).toBeLessThan(new Date(filters.to).getTime());
    expect(new Date(filters.to).getHours()).toBe(23);
  });

  it('goToPage ignora páginas fuera de rango y pide la indicada si es válida', () => {
    configure();
    serviceMock.findAcceptances.mockReturnValue(
      of({ message: 'ok', acceptances: [buildRecord()], total: 45, page: 1, limit: 20 }),
    );
    const { component } = createComponent();
    serviceMock.findAcceptances.mockClear();

    component.goToPage(0);
    component.goToPage(4);
    expect(serviceMock.findAcceptances).not.toHaveBeenCalled();

    component.goToPage(2);
    expect(serviceMock.findAcceptances).toHaveBeenCalledWith(expect.anything(), 2, 20);
  });

  it('un error al cargar muestra un toast y deja de cargar', () => {
    configure();
    serviceMock.findAcceptances.mockReturnValue(throwError(() => new Error('boom')));
    const { component } = createComponent();

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo cargar el registro de aceptaciones');
    expect(component.isLoading()).toBe(false);
  });

  it('exportCsv descarga el blob con el nombre del día', () => {
    configure();
    const downloadSpy = jest.spyOn(blobUtil, 'downloadBlob').mockImplementation(() => undefined);
    const { component } = createComponent();

    component.exportCsv();

    expect(serviceMock.exportAcceptances).toHaveBeenCalledTimes(1);
    expect(downloadSpy).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/^aceptaciones-legales-\d{4}-\d{2}-\d{2}\.csv$/),
    );
    expect(component.exporting()).toBe(false);
    downloadSpy.mockRestore();
  });

  it('exportCsv en error muestra el mensaje real vía toast', () => {
    configure();
    serviceMock.exportAcceptances.mockReturnValue(
      throwError(() => new Error('El filtro actual arroja 60000 registros.')),
    );
    const { component } = createComponent();

    component.exportCsv();

    expect(toastMock.error).toHaveBeenCalledWith('El filtro actual arroja 60000 registros.');
    expect(component.exporting()).toBe(false);
  });

  it('sin audit.view no renderiza la sección', () => {
    configure(false);
    const { fixture } = createComponent();

    expect((fixture.nativeElement as HTMLElement).querySelector('table')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Exportar CSV');
  });
});
