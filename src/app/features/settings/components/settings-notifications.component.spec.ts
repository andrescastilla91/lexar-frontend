import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SettingsNotificationsComponent } from './settings-notifications.component';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { CompanyNotificationSetting } from '../../../core/models/notification.model';

describe('SettingsNotificationsComponent', () => {
  let notificationsServiceMock: { getCompanySettings: jest.Mock; updateCompanySettings: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const settings: CompanyNotificationSetting[] = [
    {
      type: 'process.hearing_reminder',
      description: 'Recordatorio de audiencia',
      channels: [
        { channel: 'inApp', enabled: true, lockedByPlatform: false },
        { channel: 'email', enabled: false, lockedByPlatform: false },
        { channel: 'push', enabled: false, lockedByPlatform: true },
      ],
    },
  ];

  function configure(): void {
    notificationsServiceMock = {
      getCompanySettings: jest.fn().mockReturnValue(of(settings)),
      updateCompanySettings: jest.fn(),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SettingsNotificationsComponent],
      providers: [
        { provide: NotificationsService, useValue: notificationsServiceMock },
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
    const fixture = TestBed.createComponent(SettingsNotificationsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga la configuración de notificaciones de la empresa', () => {
    const component = createComponent();

    expect(notificationsServiceMock.getCompanySettings).toHaveBeenCalled();
    expect(component.settings()).toEqual(settings);
    expect(component.isLoading()).toBe(false);
  });

  it('si falla la carga, muestra un toast de error', () => {
    notificationsServiceMock.getCompanySettings.mockReturnValue(
      throwError(() => ({ error: { message: 'No se pudo cargar' } })),
    );
    const component = createComponent();

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo cargar');
    expect(component.isLoading()).toBe(false);
  });

  it('channelLabel traduce los canales conocidos y deja pasar los desconocidos', () => {
    const component = createComponent();

    expect(component.channelLabel('inApp')).toBe('In-app');
    expect(component.channelLabel('email')).toBe('Email');
    expect(component.channelLabel('push')).toBe('Push');
    expect(component.channelLabel('sms')).toBe('sms');
  });

  it('toggleChannel invierte el canal indicado en éxito y muestra un toast', () => {
    notificationsServiceMock.updateCompanySettings.mockReturnValue(of(undefined));
    const component = createComponent();

    component.toggleChannel('process.hearing_reminder', 'email', false);

    expect(notificationsServiceMock.updateCompanySettings).toHaveBeenCalledWith([
      { type: 'process.hearing_reminder', channel: 'email', enabled: true },
    ]);
    expect(component.settings()[0].channels.find((c) => c.channel === 'email')?.enabled).toBe(true);
    expect(component.savingKey()).toBeNull();
    expect(toastServiceMock.success).toHaveBeenCalledWith('Configuración de notificaciones actualizada.');
  });

  it('toggleChannel ignora clics repetidos mientras ya hay uno en curso', () => {
    const component = createComponent();
    component.savingKey.set('process.hearing_reminder:email');

    component.toggleChannel('process.hearing_reminder', 'inApp', true);

    expect(notificationsServiceMock.updateCompanySettings).not.toHaveBeenCalled();
  });

  it('toggleChannel en error muestra un toast y libera savingKey', () => {
    notificationsServiceMock.updateCompanySettings.mockReturnValue(
      throwError(() => ({ error: { message: 'No se pudo actualizar' } })),
    );
    const component = createComponent();

    component.toggleChannel('process.hearing_reminder', 'email', false);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo actualizar');
    expect(component.savingKey()).toBeNull();
  });
});
