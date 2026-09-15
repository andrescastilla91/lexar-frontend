import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ClientsTableComponent } from './clients-table.component';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ClientPersonType, ClientResponse } from '../../../core/models/client-backend.model';

// F33 (2026-09-14): ClientResponse ya no trae companyName/phone/email/
// assignedAdvisor (email/phone/companyName se movieron a ClientContact,
// asignados quedaron en `advisors[]`) — este fixture refleja el modelo
// actual, no el de antes de F33.
function buildClient(overrides: Partial<ClientResponse> = {}): ClientResponse {
  return {
    id: 'c1',
    fullName: 'María González',
    personType: ClientPersonType.NATURAL,
    address: 'Calle 100',
    documentType: { id: 'd1', code: 'CC', label: 'Cédula', color: null },
    identificationNumber: '123456789',
    riskLevel: { id: 'r1', code: 'LOW', label: 'Bajo', color: '#22c55e' },
    laftRisk: { id: 'l1', code: 'LOW', label: 'Bajo', color: '#22c55e' },
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    contacts: [],
    advisors: [],
    ...overrides,
  };
}

describe('ClientsTableComponent', () => {
  function configure(permissions: string[]): void {
    TestBed.configureTestingModule({
      imports: [ClientsTableComponent],
      providers: [
        // El link "Ver ficha" usa routerLink — necesita un Router real en
        // el injector (NG0201 sin esto: RouterLink pide ActivatedRoute).
        provideRouter([]),
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn((perms: string[]) => perms.some((p) => permissions.includes(p))),
            hasPermission: jest.fn((perm: string) => permissions.includes(perm)),
            userPermissions: signal(permissions),
          },
        },
      ],
    });
  }

  function createComponent(clients: ClientResponse[] = [buildClient()], isLoading = false) {
    const fixture = TestBed.createComponent(ClientsTableComponent);
    fixture.componentRef.setInput('clients', clients);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('muestra el spinner de carga cuando isLoading es true', () => {
    configure([]);
    const { fixture } = createComponent([], true);

    expect(fixture.nativeElement.querySelector('.animate-spin')).not.toBeNull();
  });

  it('muestra el mensaje vacío cuando no hay clientes', () => {
    configure([]);
    const { fixture } = createComponent([]);

    expect(fixture.nativeElement.textContent).toContain('No se encontraron clientes');
  });

  it('con clients.view, muestra el link "Ver ficha"', () => {
    configure(['clients.view']);
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelector('a[title="Ver ficha"]')).not.toBeNull();
  });

  it('sin clients.view, oculta el link "Ver ficha"', () => {
    configure([]);
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelector('a[title="Ver ficha"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Ver ficha');
  });

  it('con clients.activate/deactivate, muestra el botón de cambiar estado', () => {
    configure(['clients.activate', 'clients.deactivate']);
    const { fixture } = createComponent();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);

    expect(titles).toContain('Desactivar cliente');
  });

  it('sin clients.activate/deactivate, oculta el botón de cambiar estado', () => {
    configure([]);
    const { fixture } = createComponent();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);

    expect(titles).not.toContain('Desactivar cliente');
    expect(titles).not.toContain('Activar cliente');
  });

  it('emite toggleStatus al hacer click en activar/desactivar con permiso', () => {
    configure(['clients.activate', 'clients.deactivate']);
    const client = buildClient({ isActive: false });
    const { fixture, component } = createComponent([client]);
    const toggleSpy = jest.fn();
    component.toggleStatus.subscribe(toggleSpy);

    const toggleButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).title === 'Activar cliente',
    ) as HTMLButtonElement;
    toggleButton.click();

    expect(toggleSpy).toHaveBeenCalledWith(client);
  });

  it('muestra "Sin asignar" cuando el cliente no tiene asesores', () => {
    configure([]);
    const { fixture } = createComponent([buildClient({ advisors: [] })]);

    expect(fixture.nativeElement.textContent).toContain('Sin asignar');
  });

  it('muestra el nombre de los asesores asignados', () => {
    configure([]);
    const { fixture } = createComponent([
      buildClient({ advisors: [{ id: 'a1', firstName: 'Juan', lastName: 'Pérez', email: 'juan@lexar.com' }] }),
    ]);

    expect(fixture.nativeElement.textContent).toContain('Juan Pérez');
  });

  it('formatAdvisors devuelve vacío cuando advisors es undefined (fallback ??)', () => {
    configure([]);
    const { component } = createComponent([]);

    expect(component['formatAdvisors'](buildClient({ advisors: undefined }))).toBe('');
  });

  it('muestra N/A cuando faltan documentType o riskLevel', () => {
    configure([]);
    const { fixture } = createComponent([
      buildClient({ documentType: null, riskLevel: null }),
    ]);

    expect(fixture.nativeElement.textContent).toContain('N/A');
  });
});
