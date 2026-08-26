import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminMetricsComponent } from './admin-metrics.component';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { AdminMetrics } from '../../../core/models/admin.model';

describe('AdminMetricsComponent', () => {
  let platformAdminServiceMock: { getMetrics: jest.Mock };

  const metrics: AdminMetrics = {
    tenantsTotal: 20,
    tenantsActive: 15,
    tenantsTrialing: 3,
    tenantsSuspended: 2,
    mrr: 3500000,
    signupsByMonth: [
      { month: '2026-06', count: 4 },
      { month: '2026-07', count: 8 },
      { month: '2026-08', count: 2 },
    ],
  };

  function configure(): void {
    platformAdminServiceMock = { getMetrics: jest.fn().mockReturnValue(of(metrics)) };

    TestBed.configureTestingModule({
      imports: [AdminMetricsComponent],
      providers: [{ provide: PlatformAdminService, useValue: platformAdminServiceMock }],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AdminMetricsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga las métricas y apaga el loading', () => {
    const component = createComponent();

    expect(component.metrics()).toEqual(metrics);
    expect(component.isLoading()).toBe(false);
  });

  it('en error apaga el loading y deja las métricas en null', () => {
    platformAdminServiceMock.getMetrics.mockReturnValue(throwError(() => new Error('Error al cargar las métricas')));

    const component = createComponent();

    expect(component.isLoading()).toBe(false);
    expect(component.metrics()).toBeNull();
  });

  it('formatPrice formatea como moneda COP sin decimales', () => {
    const component = createComponent();

    expect(component.formatPrice(3500000)).toContain('3.500.000');
  });

  it('barHeight calcula el porcentaje relativo al valor máximo', () => {
    const component = createComponent();
    const rows = [{ count: 4 }, { count: 8 }, { count: 2 }];

    expect(component.barHeight(8, rows)).toBe(100);
    expect(component.barHeight(4, rows)).toBe(50);
  });

  it('barHeight nunca baja de 4 aunque el conteo sea 0', () => {
    const component = createComponent();
    const rows = [{ count: 0 }, { count: 8 }];

    expect(component.barHeight(0, rows)).toBe(4);
  });

  it('barHeight no divide por cero cuando todos los conteos son 0', () => {
    const component = createComponent();
    const rows = [{ count: 0 }, { count: 0 }];

    expect(component.barHeight(0, rows)).toBe(4);
  });
});
