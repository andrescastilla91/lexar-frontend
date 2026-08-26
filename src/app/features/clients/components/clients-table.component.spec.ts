import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ClientsTableComponent } from './clients-table.component';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ClientResponse } from '../../../core/models/client-backend.model';

function buildClient(overrides: Partial<ClientResponse> = {}): ClientResponse {
  return {
    id: 'c1',
    fullName: 'María González',
    companyName: 'Corporación Legal S.A.S.',
    phone: '3001234567',
    email: 'maria@lexar.com',
    address: 'Calle 100',
    documentType: { id: 'd1', code: 'CC', label: 'Cédula', color: null },
    identificationNumber: '123456789',
    riskLevel: { id: 'r1', code: 'LOW', label: 'Bajo', color: '#22c55e' },
    isActive: true,
    assignedAdvisor: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('ClientsTableComponent', () => {
  function configure(permissions: string[]): void {
    TestBed.configureTestingModule({
      imports: [ClientsTableComponent],
      providers: [
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

  it('con todos los permisos, muestra editar y cambiar estado', () => {
    configure(['clients.edit', 'clients.activate', 'clients.deactivate']);
    const { fixture } = createComponent();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);

    expect(titles).toContain('Editar');
    expect(titles).toContain('Desactivar cliente');
  });

  it('sin permisos, oculta editar y cambiar estado', () => {
    configure([]);
    const { fixture } = createComponent();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);

    expect(titles).not.toContain('Editar');
    expect(titles).not.toContain('Desactivar cliente');
  });

  it('emite edit al hacer click en editar con permiso', () => {
    configure(['clients.edit']);
    const client = buildClient();
    const { fixture, component } = createComponent([client]);
    const editSpy = jest.fn();
    component.edit.subscribe(editSpy);

    const editButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).title === 'Editar',
    ) as HTMLButtonElement;
    editButton.click();

    expect(editSpy).toHaveBeenCalledWith(client);
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

  it('muestra N/A cuando faltan documentType, companyName o riskLevel', () => {
    configure([]);
    const { fixture } = createComponent([
      buildClient({ documentType: null, companyName: null, riskLevel: null }),
    ]);

    expect(fixture.nativeElement.textContent).toContain('N/A');
  });
});
