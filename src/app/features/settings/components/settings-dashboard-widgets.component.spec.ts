import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SettingsDashboardWidgetsComponent } from './settings-dashboard-widgets.component';
import { DashboardWidgetsService } from '../../../core/services/dashboard-widgets.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { DashboardWidgetCompanySetting } from '../../../core/models/dashboard-widgets.model';

describe('SettingsDashboardWidgetsComponent', () => {
  let dashboardWidgetsServiceMock: { getCompanySettings: jest.Mock; updateCompanySettings: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const settings: DashboardWidgetCompanySetting[] = [
    { key: 'stats', title: 'Indicadores clave', description: 'KPIs de procesos', enabled: true, lockedByPlatform: false },
    { key: 'top-advisors', title: 'Asesores destacados', description: 'Calificación del equipo', enabled: false, lockedByPlatform: false },
    { key: 'today-tasks', title: 'Tareas de hoy', description: 'Trabajo pendiente', enabled: false, lockedByPlatform: true },
  ];

  function configure(): void {
    dashboardWidgetsServiceMock = {
      getCompanySettings: jest.fn().mockReturnValue(of(settings)),
      updateCompanySettings: jest.fn(),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SettingsDashboardWidgetsComponent],
      providers: [
        { provide: DashboardWidgetsService, useValue: dashboardWidgetsServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal<string[]>([]),
          },
        },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(SettingsDashboardWidgetsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga la configuración de widgets de la empresa', () => {
    const component = createComponent();

    expect(dashboardWidgetsServiceMock.getCompanySettings).toHaveBeenCalled();
    expect(component.settings()).toEqual(settings);
    expect(component.isLoading()).toBe(false);
  });

  it('si falla la carga, muestra un toast de error', () => {
    // BUG-20: el mock simula la forma real que arma error.interceptor.ts
    // ({message, statusCode, error}) — el componente lee error.message, no
    // error.error?.message.
    dashboardWidgetsServiceMock.getCompanySettings.mockReturnValue(
      throwError(() => ({ message: 'No se pudo cargar' })),
    );
    const component = createComponent();

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo cargar');
    expect(component.isLoading()).toBe(false);
  });

  it('toggleWidget invierte el widget indicado en éxito y muestra un toast', () => {
    const updated = settings.map((s) => (s.key === 'stats' ? { ...s, enabled: false } : s));
    dashboardWidgetsServiceMock.updateCompanySettings.mockReturnValue(of(updated));
    const component = createComponent();

    component.toggleWidget('stats', true);

    expect(dashboardWidgetsServiceMock.updateCompanySettings).toHaveBeenCalledWith([
      { widgetKey: 'stats', enabled: false },
    ]);
    expect(component.settings()).toEqual(updated);
    expect(component.savingKey()).toBeNull();
    expect(toastServiceMock.success).toHaveBeenCalledWith('Configuración de widgets actualizada.');
  });

  it('toggleWidget ignora clics repetidos mientras ya hay uno en curso', () => {
    const component = createComponent();
    component.savingKey.set('stats');

    component.toggleWidget('top-advisors', false);

    expect(dashboardWidgetsServiceMock.updateCompanySettings).not.toHaveBeenCalled();
  });

  it('toggleWidget en error muestra un toast y libera savingKey', () => {
    dashboardWidgetsServiceMock.updateCompanySettings.mockReturnValue(
      throwError(() => ({ message: 'No se pudo actualizar' })),
    );
    const component = createComponent();

    component.toggleWidget('stats', true);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo actualizar');
    expect(component.savingKey()).toBeNull();
  });
});
