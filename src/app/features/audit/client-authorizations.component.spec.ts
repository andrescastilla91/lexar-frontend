import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ClientAuthorizationsComponent } from './client-authorizations.component';
import { LegalComplianceService } from '../../core/services/legal-compliance.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { ClientAuthorizationRecord } from '../../core/models/legal-compliance.model';
import * as blobUtil from '../../core/utils/blob-download.util';

function buildRecord(overrides: Partial<ClientAuthorizationRecord> = {}): ClientAuthorizationRecord {
  return {
    clientId: 'client-1',
    fullName: 'Ana Pérez',
    identificationNumber: '123456',
    authorized: true,
    authorizedAt: '2026-10-02T00:00:00.000Z',
    method: 'FISICA',
    methodLabel: 'Física',
    attachment: { fileId: 'file-1', originalFilename: 'autorizacion.pdf' },
    ...overrides,
  };
}

describe('ClientAuthorizationsComponent', () => {
  let serviceMock: { findClientAuthorizations: jest.Mock; exportClientAuthorizations: jest.Mock };
  let toastMock: { error: jest.Mock; success: jest.Mock };

  function configure(hasPermission = true): void {
    serviceMock = {
      findClientAuthorizations: jest.fn().mockReturnValue(
        of({ message: 'ok', authorizations: [buildRecord()], total: 1, page: 1, limit: 20 }),
      ),
      exportClientAuthorizations: jest.fn().mockReturnValue(of(new Blob(['x']))),
    };
    toastMock = { error: jest.fn(), success: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ClientAuthorizationsComponent],
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
    const fixture = TestBed.createComponent(ClientAuthorizationsComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('al inicializar pide la primera página sin filtros', () => {
    configure();
    const { component } = createComponent();

    expect(serviceMock.findClientAuthorizations).toHaveBeenCalledWith(
      { from: undefined, to: undefined, status: undefined, method: undefined, search: undefined },
      1,
      20,
    );
    expect(component.records()).toHaveLength(1);
  });

  it('pinta cliente, estado obtenido, medio y soporte adjunto', () => {
    configure();
    const { fixture } = createComponent();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ana Pérez');
    expect(text).toContain('123456');
    expect(text).toContain('Obtenida');
    expect(text).toContain('Física');
    expect(text).toContain('autorizacion.pdf');
  });

  it('un cliente sin autorización se pinta como pendiente y sin fecha/medio/soporte', () => {
    configure();
    serviceMock.findClientAuthorizations.mockReturnValue(
      of({
        message: 'ok',
        authorizations: [
          buildRecord({ authorized: false, authorizedAt: null, method: null, methodLabel: null, attachment: null }),
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    );
    const { fixture, component } = createComponent();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Pendiente');
    expect(component.formatDate(null)).toBe('—');
  });

  it('muestra el estado vacío cuando no hay clientes', () => {
    configure();
    serviceMock.findClientAuthorizations.mockReturnValue(
      of({ message: 'ok', authorizations: [], total: 0, page: 1, limit: 20 }),
    );
    const { fixture } = createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay clientes con estos filtros.');
  });

  it('cambiar un filtro vuelve a pedir desde la página 1', () => {
    configure();
    const { component } = createComponent();
    serviceMock.findClientAuthorizations.mockClear();

    component.status = 'pending';
    component.method = 'DIGITAL';
    component.applyFilters();

    expect(serviceMock.findClientAuthorizations).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', method: 'DIGITAL' }),
      1,
      20,
    );
  });

  it('applyFilters no repite la petición si los filtros no cambiaron', () => {
    configure();
    const { component } = createComponent();
    serviceMock.findClientAuthorizations.mockClear();

    component.applyFilters();

    expect(serviceMock.findClientAuthorizations).not.toHaveBeenCalled();
  });

  it('goToPage valida el rango antes de pedir', () => {
    configure();
    serviceMock.findClientAuthorizations.mockReturnValue(
      of({ message: 'ok', authorizations: [buildRecord()], total: 45, page: 1, limit: 20 }),
    );
    const { component } = createComponent();
    serviceMock.findClientAuthorizations.mockClear();

    component.goToPage(0);
    component.goToPage(4);
    expect(serviceMock.findClientAuthorizations).not.toHaveBeenCalled();

    component.goToPage(3);
    expect(serviceMock.findClientAuthorizations).toHaveBeenCalledWith(expect.anything(), 3, 20);
  });

  it('un error al cargar muestra un toast y deja de cargar', () => {
    configure();
    serviceMock.findClientAuthorizations.mockReturnValue(throwError(() => new Error('boom')));
    const { component } = createComponent();

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo cargar el registro de autorizaciones');
    expect(component.isLoading()).toBe(false);
  });

  it('exportCsv descarga el blob con el nombre del día', () => {
    configure();
    const downloadSpy = jest.spyOn(blobUtil, 'downloadBlob').mockImplementation(() => undefined);
    const { component } = createComponent();

    component.exportCsv();

    expect(serviceMock.exportClientAuthorizations).toHaveBeenCalledTimes(1);
    expect(downloadSpy).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/^autorizaciones-clientes-\d{4}-\d{2}-\d{2}\.csv$/),
    );
    expect(component.exporting()).toBe(false);
    downloadSpy.mockRestore();
  });

  it('exportCsv en error muestra el mensaje real vía toast', () => {
    configure();
    serviceMock.exportClientAuthorizations.mockReturnValue(throwError(() => new Error('Más del límite.')));
    const { component } = createComponent();

    component.exportCsv();

    expect(toastMock.error).toHaveBeenCalledWith('Más del límite.');
    expect(component.exporting()).toBe(false);
  });

  it('sin audit.view no renderiza la sección', () => {
    configure(false);
    const { fixture } = createComponent();

    expect((fixture.nativeElement as HTMLElement).querySelector('table')).toBeNull();
  });
});
