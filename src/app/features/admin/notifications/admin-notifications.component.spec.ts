import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminNotificationsComponent } from './admin-notifications.component';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  PlatformNotificationChannelSetting,
  PlatformNotificationTypeSetting,
} from '../../../core/models/admin.model';

describe('AdminNotificationsComponent', () => {
  let platformAdminServiceMock: {
    getNotificationTypes: jest.Mock;
    getNotificationChannels: jest.Mock;
    updateNotificationType: jest.Mock;
    updateNotificationTypeChannel: jest.Mock;
    updateNotificationChannel: jest.Mock;
  };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const typeSetting: PlatformNotificationTypeSetting = {
    type: 'deadline.reminder',
    description: 'Recordatorio de plazo',
    label: null,
    defaultChannels: ['inApp', 'email'],
    channels: [
      { channel: 'inApp', enabled: true, isDefault: true },
      { channel: 'email', enabled: true, isDefault: true },
      { channel: 'push', enabled: false, isDefault: false },
    ],
    enabled: true,
  };

  const channelSetting: PlatformNotificationChannelSetting = { channel: 'email', enabled: true };

  function configure(): void {
    platformAdminServiceMock = {
      getNotificationTypes: jest.fn().mockReturnValue(of([typeSetting])),
      getNotificationChannels: jest.fn().mockReturnValue(of([channelSetting])),
      updateNotificationType: jest.fn(),
      updateNotificationTypeChannel: jest.fn(),
      updateNotificationChannel: jest.fn(),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AdminNotificationsComponent],
      providers: [
        { provide: PlatformAdminService, useValue: platformAdminServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AdminNotificationsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga tipos y canales', () => {
    const component = createComponent();

    expect(component.types()).toEqual([typeSetting]);
    expect(component.channels()).toEqual([channelSetting]);
    expect(component.isLoadingTypes()).toBe(false);
    expect(component.isLoadingChannels()).toBe(false);
  });

  it('en error al cargar tipos notifica y apaga el loading', () => {
    platformAdminServiceMock.getNotificationTypes.mockReturnValue(
      throwError(() => new Error('Error al cargar los tipos de notificación')),
    );

    const component = createComponent();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al cargar los tipos de notificación');
    expect(component.isLoadingTypes()).toBe(false);
  });

  it('en error al cargar canales notifica y apaga el loading', () => {
    platformAdminServiceMock.getNotificationChannels.mockReturnValue(
      throwError(() => new Error('Error al cargar los canales de notificación')),
    );

    const component = createComponent();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al cargar los canales de notificación');
    expect(component.isLoadingChannels()).toBe(false);
  });

  it('channelLabel traduce los canales conocidos y usa el crudo si no lo conoce', () => {
    const component = createComponent();

    expect(component.channelLabel('email')).toBe('Email');
    expect(component.channelLabel('inApp')).toBe('In-app');
    expect(component.channelLabel('push')).toBe('Push');
    expect(component.channelLabel('sms')).toBe('sms');
  });

  it('startEditLabel entra en modo edición con el label o la descripción como borrador', () => {
    const component = createComponent();

    component.startEditLabel(typeSetting);

    expect(component.editingType()).toBe('deadline.reminder');
    expect(component.draftLabel).toBe('Recordatorio de plazo');
  });

  it('cancelEditLabel limpia el modo edición', () => {
    const component = createComponent();
    component.startEditLabel(typeSetting);

    component.cancelEditLabel();

    expect(component.editingType()).toBeNull();
    expect(component.draftLabel).toBe('');
  });

  it('saveLabel en éxito actualiza el label localmente y sale de edición', () => {
    platformAdminServiceMock.updateNotificationType.mockReturnValue(of(void 0));
    const component = createComponent();
    component.startEditLabel(typeSetting);
    component.draftLabel = 'Alerta de vencimiento';

    component.saveLabel(typeSetting);

    expect(platformAdminServiceMock.updateNotificationType).toHaveBeenCalledWith('deadline.reminder', {
      label: 'Alerta de vencimiento',
    });
    expect(component.types()[0].label).toBe('Alerta de vencimiento');
    expect(component.editingType()).toBeNull();
    expect(toastServiceMock.success).toHaveBeenCalledWith('Nombre actualizado.');
    expect(component.isSavingLabel()).toBe(false);
  });

  it('saveLabel envía null cuando el borrador coincide con la descripción original', () => {
    platformAdminServiceMock.updateNotificationType.mockReturnValue(of(void 0));
    const component = createComponent();
    component.startEditLabel(typeSetting);
    component.draftLabel = 'Recordatorio de plazo';

    component.saveLabel(typeSetting);

    expect(platformAdminServiceMock.updateNotificationType).toHaveBeenCalledWith('deadline.reminder', {
      label: null,
    });
  });

  it('saveLabel en error notifica y libera el estado de guardado', () => {
    platformAdminServiceMock.updateNotificationType.mockReturnValue(
      throwError(() => new Error('No se pudo renombrar el evento.')),
    );
    const component = createComponent();
    component.startEditLabel(typeSetting);
    component.draftLabel = 'Alerta de vencimiento';

    component.saveLabel(typeSetting);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo renombrar el evento.');
    expect(component.isSavingLabel()).toBe(false);
  });

  it('toggleType invierte el estado activo y notifica éxito', () => {
    platformAdminServiceMock.updateNotificationType.mockReturnValue(of(void 0));
    const component = createComponent();

    component.toggleType(typeSetting);

    expect(platformAdminServiceMock.updateNotificationType).toHaveBeenCalledWith('deadline.reminder', {
      enabled: false,
    });
    expect(component.types()[0].enabled).toBe(false);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Evento desactivado.');
    expect(component.isSavingType()).toBeNull();
  });

  it('toggleType en error notifica y libera el estado de guardado', () => {
    platformAdminServiceMock.updateNotificationType.mockReturnValue(
      throwError(() => new Error('No se pudo actualizar el evento.')),
    );
    const component = createComponent();

    component.toggleType(typeSetting);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo actualizar el evento.');
    expect(component.isSavingType()).toBeNull();
  });

  it('toggleTypeChannel habilita un canal que estaba deshabilitado', () => {
    platformAdminServiceMock.updateNotificationTypeChannel.mockReturnValue(of(void 0));
    const component = createComponent();

    component.toggleTypeChannel(typeSetting, 'push');

    expect(platformAdminServiceMock.updateNotificationTypeChannel).toHaveBeenCalledWith(
      'deadline.reminder',
      'push',
      true,
    );
    const updatedChannel = component.types()[0].channels.find((c) => c.channel === 'push');
    expect(updatedChannel?.enabled).toBe(true);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Canal habilitado para este evento.');
  });

  it('toggleTypeChannel en error notifica y libera el estado de guardado', () => {
    platformAdminServiceMock.updateNotificationTypeChannel.mockReturnValue(
      throwError(() => new Error('No se pudo actualizar el canal de este evento.')),
    );
    const component = createComponent();

    component.toggleTypeChannel(typeSetting, 'push');

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo actualizar el canal de este evento.');
    expect(component.isSavingTypeChannel()).toBeNull();
  });

  it('toggleChannel invierte el estado del canal global y notifica éxito', () => {
    platformAdminServiceMock.updateNotificationChannel.mockReturnValue(of(void 0));
    const component = createComponent();

    component.toggleChannel(channelSetting);

    expect(platformAdminServiceMock.updateNotificationChannel).toHaveBeenCalledWith('email', false);
    expect(component.channels()[0].enabled).toBe(false);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Canal desactivado.');
  });

  it('toggleChannel en error notifica y libera el estado de guardado', () => {
    platformAdminServiceMock.updateNotificationChannel.mockReturnValue(
      throwError(() => new Error('No se pudo actualizar el canal.')),
    );
    const component = createComponent();

    component.toggleChannel(channelSetting);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo actualizar el canal.');
    expect(component.isSavingChannel()).toBeNull();
  });
});
