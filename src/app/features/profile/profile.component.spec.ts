import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ProfileUser, SessionInfo } from '../../core/models/profile.model';

describe('ProfileComponent', () => {
  let profileServiceMock: {
    getMe: jest.Mock;
    updateMe: jest.Mock;
    changePassword: jest.Mock;
    getSessions: jest.Mock;
    revokeSession: jest.Mock;
    uploadAvatar: jest.Mock;
  };
  let authServiceMock: {
    logout: jest.Mock;
    patchCurrentUser: jest.Mock;
    currentUser: jest.Mock;
    setupTwoFactor: jest.Mock;
    verifyTwoFactor: jest.Mock;
    disableTwoFactor: jest.Mock;
    regenerateTwoFactorRecoveryCodes: jest.Mock;
  };
  let themeServiceMock: { setPreference: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let notificationsServiceMock: {
    getPreferences: jest.Mock;
    updatePreferences: jest.Mock;
    getPushState: jest.Mock;
    enablePush: jest.Mock;
    disablePush: jest.Mock;
  };
  let navigateByUrlSpy: jest.SpyInstance;

  const baseUser: ProfileUser = {
    id: '1',
    firstName: 'Ana',
    lastName: 'Gómez',
    email: 'ana@lexar.com',
    isActive: true,
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    phone: null,
    themePreference: 'system',
    avatarUrl: null,
    roles: [],
  };

  const session: SessionInfo = {
    id: 's1',
    userAgent: 'Chrome',
    ip: '127.0.0.1',
    createdAt: '2026-01-01T00:00:00.000Z',
    current: true,
  };

  function configure(): void {
    profileServiceMock = {
      getMe: jest.fn().mockReturnValue(of(baseUser)),
      updateMe: jest.fn(),
      changePassword: jest.fn(),
      getSessions: jest.fn().mockReturnValue(of([session])),
      revokeSession: jest.fn().mockReturnValue(of(undefined)),
      uploadAvatar: jest.fn(),
    };
    authServiceMock = {
      logout: jest.fn().mockReturnValue(of(undefined)),
      patchCurrentUser: jest.fn(),
      currentUser: jest.fn().mockReturnValue({ email: baseUser.email, roles: [], permissions: [] }),
      setupTwoFactor: jest.fn(),
      verifyTwoFactor: jest.fn(),
      disableTwoFactor: jest.fn(),
      regenerateTwoFactorRecoveryCodes: jest.fn(),
    };
    themeServiceMock = { setPreference: jest.fn() };
    confirmDialogMock = { confirm: jest.fn() };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    notificationsServiceMock = {
      getPreferences: jest.fn().mockReturnValue(of([])),
      updatePreferences: jest.fn().mockReturnValue(of(undefined)),
      getPushState: jest.fn().mockResolvedValue('not-subscribed'),
      enablePush: jest.fn().mockResolvedValue(undefined),
      disablePush: jest.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: profileServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: NotificationsService, useValue: notificationsServiceMock },
      ],
    });

    const router = TestBed.inject(Router);
    navigateByUrlSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  }

  function createComponent() {
    const fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga el perfil y las sesiones', () => {
    const component = createComponent();

    expect(profileServiceMock.getMe).toHaveBeenCalled();
    expect(profileServiceMock.getSessions).toHaveBeenCalled();
    expect(component.user()).toEqual(baseUser);
    expect(component.sessions()).toEqual([session]);
    expect(component.infoForm.getRawValue()).toEqual({
      firstName: 'Ana',
      lastName: 'Gómez',
      phone: '',
      themePreference: 'system',
    });
  });

  it('si falla la carga del perfil, muestra un mensaje de error', () => {
    profileServiceMock.getMe.mockReturnValue(throwError(() => new Error('fail')));
    const component = createComponent();

    expect(component.profileError()).toBe('No se pudo cargar tu perfil.');
  });

  it('onSubmitProfile no hace nada si ya está enviando', () => {
    const component = createComponent();
    component.isSubmittingProfile.set(true);

    component.onSubmitProfile();

    expect(profileServiceMock.updateMe).not.toHaveBeenCalled();
  });

  it('onSubmitProfile actualiza el perfil y sincroniza el tema en éxito', () => {
    const updated: ProfileUser = { ...baseUser, firstName: 'Nuevo', themePreference: 'dark' };
    profileServiceMock.updateMe.mockReturnValue(of(updated));
    const component = createComponent();

    component.onSubmitProfile();

    expect(profileServiceMock.updateMe).toHaveBeenCalled();
    expect(component.user()).toEqual(updated);
    expect(themeServiceMock.setPreference).toHaveBeenCalledWith('dark');
    expect(component.isSubmittingProfile()).toBe(false);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Perfil actualizado correctamente.');
  });

  it('onSubmitProfile en error muestra el mensaje del backend y un toast', () => {
    // BUG-20 ola 1: ProfileService no envuelve sus errores — el componente
    // recibe directo el objeto de error.interceptor.ts, con .message ya
    // resuelto (no anidado bajo .error).
    profileServiceMock.updateMe.mockReturnValue(
      throwError(() => ({ message: 'Teléfono inválido' })),
    );
    const component = createComponent();

    component.onSubmitProfile();

    expect(component.profileError()).toBe('Teléfono inválido');
    expect(component.isSubmittingProfile()).toBe(false);
    expect(toastServiceMock.error).toHaveBeenCalledWith('Teléfono inválido');
  });

  it('onAvatarSelected sube el archivo y actualiza el usuario', () => {
    const updated: ProfileUser = { ...baseUser, avatarUrl: 'https://cdn/avatar.png' };
    profileServiceMock.uploadAvatar.mockReturnValue(of(updated));
    const component = createComponent();
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });

    component.onAvatarSelected(file);

    expect(profileServiceMock.uploadAvatar).toHaveBeenCalledWith(file);
    expect(component.user()?.avatarUrl).toBe('https://cdn/avatar.png');
    expect(component.isUploadingAvatar()).toBe(false);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Foto de perfil actualizada correctamente.');
  });

  it('onAvatarSelected no hace nada si ya está subiendo', () => {
    const component = createComponent();
    component.isUploadingAvatar.set(true);

    component.onAvatarSelected(new File(['x'], 'a.png'));

    expect(profileServiceMock.uploadAvatar).not.toHaveBeenCalled();
  });

  it('onSubmitPassword valida el formulario antes de enviar', () => {
    const component = createComponent();

    component.onSubmitPassword();

    expect(profileServiceMock.changePassword).not.toHaveBeenCalled();
    expect(component.passwordForm.get('currentPassword')?.touched).toBe(true);
  });

  it('onSubmitPassword en éxito cierra sesión y navega a login', () => {
    profileServiceMock.changePassword.mockReturnValue(of(undefined));
    const component = createComponent();
    component.passwordForm.setValue({ currentPassword: 'actual123', newPassword: 'nuevaClave123' });

    component.onSubmitPassword();

    expect(profileServiceMock.changePassword).toHaveBeenCalledWith({
      currentPassword: 'actual123',
      newPassword: 'nuevaClave123',
    });
    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/login');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Contraseña actualizada. Vuelve a iniciar sesión.');
  });

  it('onSubmitPassword en error muestra el mensaje y detiene el envío', () => {
    profileServiceMock.changePassword.mockReturnValue(
      throwError(() => ({ message: 'Contraseña actual incorrecta' })),
    );
    const component = createComponent();
    component.passwordForm.setValue({ currentPassword: 'mala', newPassword: 'nuevaClave123' });

    component.onSubmitPassword();

    expect(component.passwordError()).toBe('Contraseña actual incorrecta');
    expect(component.isSubmittingPassword()).toBe(false);
    expect(authServiceMock.logout).not.toHaveBeenCalled();
    expect(toastServiceMock.error).toHaveBeenCalledWith('Contraseña actual incorrecta');
  });

  it('onSaveNotificationPreferences en error, muestra un toast con el mensaje real', () => {
    notificationsServiceMock.updatePreferences.mockReturnValue(
      throwError(() => ({ message: 'No se pudieron guardar' })),
    );
    const component = createComponent();

    component.onSaveNotificationPreferences();

    expect(component.isSavingPreferences()).toBe(false);
    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudieron guardar');
  });

  it('onRevokeSession no revoca si el usuario cancela el diálogo', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    component.onRevokeSession('s1');
    await Promise.resolve();

    expect(profileServiceMock.revokeSession).not.toHaveBeenCalled();
  });

  it('onRevokeSession revoca y recarga las sesiones al confirmar', async () => {
    confirmDialogMock.confirm.mockResolvedValue(true);
    const component = createComponent();
    profileServiceMock.getSessions.mockReturnValue(of([]));

    component.onRevokeSession('s1');
    await Promise.resolve();

    expect(profileServiceMock.revokeSession).toHaveBeenCalledWith('s1');
    expect(component.sessions()).toEqual([]);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Sesión cerrada correctamente.');
  });

  it('onRevokeSession en error, muestra un toast con el mensaje real', async () => {
    confirmDialogMock.confirm.mockResolvedValue(true);
    profileServiceMock.revokeSession.mockReturnValue(throwError(() => ({ message: 'No se pudo cerrar' })));
    const component = createComponent();

    component.onRevokeSession('s1');
    await Promise.resolve();

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo cerrar');
  });

  it('onStartTwoFactorSetup obtiene el secreto y muestra el formulario de confirmación', () => {
    authServiceMock.setupTwoFactor.mockReturnValue(
      of({ message: 'ok', otpauthUri: 'otpauth://totp/x', secret: 'SECRET123' }),
    );
    const component = createComponent();

    component.onStartTwoFactorSetup();

    expect(component.isSettingUpTwoFactor()).toBe(true);
    expect(component.twoFactorSecret()).toBe('SECRET123');
    expect(component.otpauthUri()).toBe('otpauth://totp/x');
  });

  it('onStartTwoFactorSetup en error, muestra un toast con el mensaje real', () => {
    authServiceMock.setupTwoFactor.mockReturnValue(throwError(() => ({ message: 'No se pudo iniciar' })));
    const component = createComponent();

    component.onStartTwoFactorSetup();

    expect(component.isStartingTwoFactor()).toBe(false);
    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo iniciar');
  });

  it('onConfirmTwoFactorSetup activa el 2FA y muestra los códigos de recuperación', () => {
    authServiceMock.verifyTwoFactor.mockReturnValue(
      of({ message: 'ok', recoveryCodes: ['AAAAA-BBBBB'] }),
    );
    const component = createComponent();

    component.onConfirmTwoFactorSetup('123456');

    expect(authServiceMock.verifyTwoFactor).toHaveBeenCalledWith('123456');
    expect(component.recoveryCodes()).toEqual(['AAAAA-BBBBB']);
    expect(component.isSettingUpTwoFactor()).toBe(false);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Verificación en dos pasos activada correctamente.');
  });

  it('onConfirmTwoFactorSetup en error, muestra el mensaje real inline y en un toast', () => {
    // BUG-20 ola 1: AuthService no envuelve sus errores — el componente
    // recibe directo el objeto de error.interceptor.ts, con .message ya
    // resuelto (no anidado bajo .error).
    authServiceMock.verifyTwoFactor.mockReturnValue(
      throwError(() => ({ message: 'Código inválido' })),
    );
    const component = createComponent();

    component.onConfirmTwoFactorSetup('000000');

    expect(component.twoFactorVerifyError()).toBe('Código inválido');
    expect(component.isVerifyingTwoFactor()).toBe(false);
    expect(toastServiceMock.error).toHaveBeenCalledWith('Código inválido');
  });

  it('onDisableTwoFactor valida el formulario antes de enviar', () => {
    const component = createComponent();

    component.onDisableTwoFactor();

    expect(authServiceMock.disableTwoFactor).not.toHaveBeenCalled();
    expect(component.disableTwoFactorForm.get('password')?.touched).toBe(true);
  });

  it('onDisableTwoFactor en éxito limpia el formulario y muestra un toast', () => {
    authServiceMock.disableTwoFactor.mockReturnValue(of({ message: 'ok' }));
    const component = createComponent();
    component.disableTwoFactorForm.setValue({ password: 'Passw0rd!', code: '123456' });

    component.onDisableTwoFactor();

    expect(authServiceMock.disableTwoFactor).toHaveBeenCalledWith('Passw0rd!', '123456');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Verificación en dos pasos desactivada correctamente.');
  });

  it('onDisableTwoFactor en error, muestra el mensaje real inline y en un toast', () => {
    authServiceMock.disableTwoFactor.mockReturnValue(throwError(() => ({ message: 'Código incorrecto' })));
    const component = createComponent();
    component.disableTwoFactorForm.setValue({ password: 'Passw0rd!', code: '000000' });

    component.onDisableTwoFactor();

    expect(component.disableTwoFactorError()).toBe('Código incorrecto');
    expect(component.isDisablingTwoFactor()).toBe(false);
    expect(toastServiceMock.error).toHaveBeenCalledWith('Código incorrecto');
  });

  it('onRegenerateRecoveryCodes valida el formulario antes de enviar', () => {
    const component = createComponent();

    component.onRegenerateRecoveryCodes();

    expect(authServiceMock.regenerateTwoFactorRecoveryCodes).not.toHaveBeenCalled();
    expect(component.disableTwoFactorForm.get('password')?.touched).toBe(true);
  });

  it('onRegenerateRecoveryCodes en éxito muestra los nuevos códigos y limpia el formulario', () => {
    authServiceMock.regenerateTwoFactorRecoveryCodes.mockReturnValue(
      of({ message: 'ok', recoveryCodes: ['CCCCC-DDDDD'] }),
    );
    const component = createComponent();
    component.disableTwoFactorForm.setValue({ password: 'Passw0rd!', code: '123456' });

    component.onRegenerateRecoveryCodes();

    expect(authServiceMock.regenerateTwoFactorRecoveryCodes).toHaveBeenCalledWith('Passw0rd!', '123456');
    expect(component.recoveryCodes()).toEqual(['CCCCC-DDDDD']);
    expect(toastServiceMock.success).toHaveBeenCalledWith('Códigos de recuperación regenerados correctamente.');
  });

  it('onRegenerateRecoveryCodes en error, muestra el mensaje real inline y en un toast', () => {
    authServiceMock.regenerateTwoFactorRecoveryCodes.mockReturnValue(
      throwError(() => ({ message: 'La contraseña ingresada es incorrecta.' })),
    );
    const component = createComponent();
    component.disableTwoFactorForm.setValue({ password: 'mala', code: '123456' });

    component.onRegenerateRecoveryCodes();

    expect(component.regenerateCodesError()).toBe('La contraseña ingresada es incorrecta.');
    expect(component.isRegeneratingRecoveryCodes()).toBe(false);
    expect(toastServiceMock.error).toHaveBeenCalledWith('La contraseña ingresada es incorrecta.');
  });
});
