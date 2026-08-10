import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminLoginComponent } from './admin-login.component';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';

describe('AdminLoginComponent', () => {
  let platformAdminServiceMock: {
    login: jest.Mock;
    setupTwoFactor: jest.Mock;
    verifyTwoFactorSetup: jest.Mock;
    loginWithTwoFactor: jest.Mock;
    isAuthenticated: jest.Mock;
  };
  let navigateSpy: jest.SpyInstance;
  let navigateByUrlSpy: jest.SpyInstance;

  function configure(returnUrl: string | null = null): void {
    platformAdminServiceMock = {
      login: jest.fn(),
      setupTwoFactor: jest.fn(),
      verifyTwoFactorSetup: jest.fn(),
      loginWithTwoFactor: jest.fn(),
      isAuthenticated: jest.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        provideRouter([]),
        { provide: PlatformAdminService, useValue: platformAdminServiceMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) } },
        },
      ],
    });

    const router = TestBed.inject(Router);
    navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    navigateByUrlSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AdminLoginComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('si ya hay sesión de platform admin, redirige a /admin/tenants al inicializar', () => {
    configure();
    platformAdminServiceMock.isAuthenticated.mockReturnValue(true);

    createComponent();

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/tenants']);
  });

  it('no envía el formulario si es inválido', () => {
    configure();
    const component = createComponent();

    component.onSubmit();

    expect(platformAdminServiceMock.login).not.toHaveBeenCalled();
    expect(component.form.get('email')?.touched).toBe(true);
  });

  it('en error de credenciales muestra el mensaje y libera isSubmitting', () => {
    configure();
    platformAdminServiceMock.login.mockReturnValue(throwError(() => new Error('Credenciales inválidas')));
    const component = createComponent();
    component.form.setValue({ email: 'admin@lexar.com', password: 'mala' });

    component.onSubmit();

    expect(component.errorMessage()).toBe('Credenciales inválidas');
    expect(component.isSubmitting()).toBe(false);
  });

  it('ignora envíos repetidos mientras ya hay uno en curso', () => {
    configure();
    const component = createComponent();
    component.isSubmitting.set(true);

    component.onSubmit();

    expect(platformAdminServiceMock.login).not.toHaveBeenCalled();
  });

  // Bug corregido 2026-07-27: el login NUNCA abre sesión por sí solo (2FA
  // obligatorio, ver PlatformLoginOutcome) — antes el componente navegaba a
  // /admin/tenants con solo este primer paso, sin cookie real, y todo
  // request subsecuente a /admin/* volvía 403.
  it('login recurrente: requires2fa=true pasa al paso de código sin navegar todavía', () => {
    configure();
    platformAdminServiceMock.login.mockReturnValue(
      of({ requiresSetup: false, requires2fa: true, pendingToken: 'ptok-1' })
    );
    const component = createComponent();
    component.form.setValue({ email: 'admin@lexar.com', password: 'secret123' });

    component.onSubmit();

    expect(component.awaitingTwoFactor()).toBe(true);
    expect(component.pendingToken()).toBe('ptok-1');
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('login recurrente: código correcto navega a returnUrl o /admin/tenants', () => {
    configure('/admin/plans');
    platformAdminServiceMock.login.mockReturnValue(
      of({ requiresSetup: false, requires2fa: true, pendingToken: 'ptok-1' })
    );
    platformAdminServiceMock.loginWithTwoFactor.mockReturnValue(of({ email: 'admin@lexar.com' }));
    const component = createComponent();
    component.form.setValue({ email: 'admin@lexar.com', password: 'secret123' });
    component.onSubmit();

    component.twoFactorForm.setValue({ code: '123456' });
    component.onSubmitTwoFactor();

    expect(platformAdminServiceMock.loginWithTwoFactor).toHaveBeenCalledWith('ptok-1', '123456');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/admin/plans');
  });

  it('login recurrente: código incorrecto muestra el error y no navega', () => {
    configure();
    platformAdminServiceMock.login.mockReturnValue(
      of({ requiresSetup: false, requires2fa: true, pendingToken: 'ptok-1' })
    );
    platformAdminServiceMock.loginWithTwoFactor.mockReturnValue(
      throwError(() => new Error('El código ingresado no es válido.'))
    );
    const component = createComponent();
    component.form.setValue({ email: 'admin@lexar.com', password: 'secret123' });
    component.onSubmit();

    component.twoFactorForm.setValue({ code: '000000' });
    component.onSubmitTwoFactor();

    expect(component.errorMessage()).toBe('El código ingresado no es válido.');
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('primer login (requiresSetup=true) pide el QR automáticamente', () => {
    configure();
    platformAdminServiceMock.login.mockReturnValue(
      of({ requiresSetup: true, requires2fa: false, pendingToken: 'ptok-2' })
    );
    platformAdminServiceMock.setupTwoFactor.mockReturnValue(
      of({ otpauthUri: 'otpauth://totp/x', secret: 'SECRET123' })
    );
    const component = createComponent();
    component.form.setValue({ email: 'admin@lexar.com', password: 'secret123' });

    component.onSubmit();

    expect(component.awaitingSetup()).toBe(true);
    expect(platformAdminServiceMock.setupTwoFactor).toHaveBeenCalledWith('ptok-2');
    expect(component.secret()).toBe('SECRET123');
  });

  it('primer login: confirmar el código activa el 2FA y muestra los códigos de recuperación', () => {
    configure();
    platformAdminServiceMock.login.mockReturnValue(
      of({ requiresSetup: true, requires2fa: false, pendingToken: 'ptok-2' })
    );
    platformAdminServiceMock.setupTwoFactor.mockReturnValue(
      of({ otpauthUri: 'otpauth://totp/x', secret: 'SECRET123' })
    );
    platformAdminServiceMock.verifyTwoFactorSetup.mockReturnValue(
      of({ user: { email: 'admin@lexar.com' }, recoveryCodes: ['a1', 'a2'] })
    );
    const component = createComponent();
    component.form.setValue({ email: 'admin@lexar.com', password: 'secret123' });
    component.onSubmit();

    component.setupForm.setValue({ code: '654321' });
    component.onSubmitSetup();

    expect(platformAdminServiceMock.verifyTwoFactorSetup).toHaveBeenCalledWith('ptok-2', '654321');
    expect(component.recoveryCodes()).toEqual(['a1', 'a2']);
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('primer login: solo navega tras confirmar que guardó los códigos de recuperación', () => {
    configure();
    platformAdminServiceMock.login.mockReturnValue(
      of({ requiresSetup: true, requires2fa: false, pendingToken: 'ptok-2' })
    );
    platformAdminServiceMock.setupTwoFactor.mockReturnValue(
      of({ otpauthUri: 'otpauth://totp/x', secret: 'SECRET123' })
    );
    platformAdminServiceMock.verifyTwoFactorSetup.mockReturnValue(
      of({ user: { email: 'admin@lexar.com' }, recoveryCodes: ['a1', 'a2'] })
    );
    const component = createComponent();
    component.form.setValue({ email: 'admin@lexar.com', password: 'secret123' });
    component.onSubmit();
    component.setupForm.setValue({ code: '654321' });
    component.onSubmitSetup();

    component.onFinishSetup();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/admin/tenants');
  });
});
