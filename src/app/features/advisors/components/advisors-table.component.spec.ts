import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AdvisorsTableComponent } from './advisors-table.component';
import { PermissionsService } from '../../../core/services/permissions.service';
import { AdvisorResponse, AdvisorStatus } from '../../../core/models/advisor-backend.model';

function buildAdvisor(overrides: Partial<AdvisorResponse> = {}): AdvisorResponse {
  return {
    id: 'a1',
    userId: 'u1',
    specialty: { id: 's1', code: 'CIVIL', label: 'Civil', color: null },
    phone: '3001234567',
    status: AdvisorStatus.AVAILABLE,
    rating: 4.5,
    experienceYears: 6,
    isActive: true,
    companyId: 'c1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' },
    ...overrides,
  };
}

describe('AdvisorsTableComponent', () => {
  function configure(permissions: string[]): void {
    TestBed.configureTestingModule({
      imports: [AdvisorsTableComponent],
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

  function createComponent(advisors: AdvisorResponse[] = [buildAdvisor()], isLoading = false) {
    const fixture = TestBed.createComponent(AdvisorsTableComponent);
    fixture.componentRef.setInput('advisors', advisors);
    fixture.componentRef.setInput('isLoading', isLoading);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('muestra el spinner de carga cuando isLoading es true', () => {
    configure([]);
    const { fixture } = createComponent([], true);

    expect(fixture.nativeElement.querySelector('.animate-spin')).not.toBeNull();
  });

  it('muestra el mensaje vacío personalizado cuando no hay asesores', () => {
    configure([]);
    const fixture = TestBed.createComponent(AdvisorsTableComponent);
    fixture.componentRef.setInput('advisors', []);
    fixture.componentRef.setInput('emptyMessage', 'Sin resultados de búsqueda');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay asesores registrados');
    expect(fixture.nativeElement.textContent).toContain('Sin resultados de búsqueda');
  });

  it('con todos los permisos, muestra las acciones de editar y estado', () => {
    configure(['advisors.edit', 'advisors.activate', 'advisors.deactivate']);
    const { fixture } = createComponent();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);

    expect(titles).toContain('Editar');
    expect(titles).toContain('Desactivar');
  });

  it('sin permisos, oculta las acciones de la tabla', () => {
    configure([]);
    const { fixture } = createComponent();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLButtonElement).title);

    expect(titles).not.toContain('Editar');
    expect(titles).not.toContain('Desactivar');
  });

  it('emite edit al hacer click en editar con permiso', () => {
    configure(['advisors.edit']);
    const advisor = buildAdvisor();
    const { fixture, component } = createComponent([advisor]);
    const editSpy = jest.fn();
    component.edit.subscribe(editSpy);

    const editButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).title === 'Editar',
    ) as HTMLButtonElement;
    editButton.click();

    expect(editSpy).toHaveBeenCalledWith(advisor);
  });

  it('emite toggleStatus al hacer click en desactivar/activar con permiso', () => {
    configure(['advisors.activate', 'advisors.deactivate']);
    const advisor = buildAdvisor({ isActive: false });
    const { fixture, component } = createComponent([advisor]);
    const toggleSpy = jest.fn();
    component.toggleStatus.subscribe(toggleSpy);

    const toggleButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).title === 'Activar',
    ) as HTMLButtonElement;
    toggleButton.click();

    expect(toggleSpy).toHaveBeenCalledWith(advisor);
  });

  it('getStatusLabel traduce cada estado y usa el código crudo como fallback', () => {
    configure([]);
    const { component } = createComponent();

    expect(component.getStatusLabel(AdvisorStatus.AVAILABLE)).toBe('Disponible');
    expect(component.getStatusLabel(AdvisorStatus.IN_HEARING)).toBe('En audiencia');
    expect(component.getStatusLabel(AdvisorStatus.IN_MEETING)).toBe('En reunión');
    expect(component.getStatusLabel(AdvisorStatus.BUSY)).toBe('Ocupado');
    expect(component.getStatusLabel('OTRO' as AdvisorStatus)).toBe('OTRO');
  });

  it('statusClasses y dotClasses devuelven las clases esperadas para cada estado', () => {
    configure([]);
    const { component } = createComponent();

    expect(component.statusClasses(AdvisorStatus.AVAILABLE)).toContain('success');
    expect(component.statusClasses(AdvisorStatus.IN_HEARING)).toContain('warning');
    expect(component.statusClasses(AdvisorStatus.IN_MEETING)).toContain('info');
    expect(component.statusClasses(AdvisorStatus.BUSY)).toContain('muted');
    expect(component.statusClasses('OTRO' as AdvisorStatus)).toContain('muted');

    expect(component.dotClasses(AdvisorStatus.AVAILABLE)).toBe('bg-success');
    expect(component.dotClasses(AdvisorStatus.IN_HEARING)).toBe('bg-warning');
    expect(component.dotClasses(AdvisorStatus.IN_MEETING)).toBe('bg-primary');
    expect(component.dotClasses(AdvisorStatus.BUSY)).toBe('bg-strong');
    expect(component.dotClasses('OTRO' as AdvisorStatus)).toBe('bg-strong');
  });

  it('muestra la calificación solo cuando rating es mayor a 0', () => {
    configure([]);
    const { fixture } = createComponent([buildAdvisor({ rating: 0 })]);

    expect(fixture.nativeElement.textContent).not.toContain('4.5');
  });
});
