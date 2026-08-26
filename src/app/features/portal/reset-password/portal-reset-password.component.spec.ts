import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PortalResetPasswordComponent } from './portal-reset-password.component';
import { PortalAuthService } from '../../../core/services/portal-auth.service';

describe('PortalResetPasswordComponent', () => {
  let portalAuthServiceMock: { resetPassword: jest.Mock };
  let navigateByUrlSpy: jest.SpyInstance;

  function configure(queryToken: string | null) {
    portalAuthServiceMock = { resetPassword: jest.fn() };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => queryToken } },
    };

    return TestBed.configureTestingModule({
      imports: [PortalResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: PortalAuthService, useValue: portalAuthServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    })
      .compileComponents()
      .then(() => {
        const router = TestBed.inject(Router);
        navigateByUrlSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(PortalResetPasswordComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('sin token en la URL, no permite enviar el formulario', async () => {
    await configure(null);
    const component = createComponent();

    expect(component.token()).toBeNull();

    component.form.setValue({ newPassword: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(portalAuthServiceMock.resetPassword).not.toHaveBeenCalled();
  });

  it('si las contraseñas no coinciden, el formulario es inválido y no llama al servicio', async () => {
    await configure('token-valido');
    const component = createComponent();

    component.form.setValue({ newPassword: 'NuevaPass123!', confirmPassword: 'OtraCosa456!' });
    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(portalAuthServiceMock.resetPassword).not.toHaveBeenCalled();
  });

  it('con token y contraseñas coincidentes, en éxito marca success y redirige a portal/login', async () => {
    jest.useFakeTimers();
    await configure('token-valido');
    portalAuthServiceMock.resetPassword.mockReturnValue(of({ success: true }));
    const component = createComponent();

    component.form.setValue({ newPassword: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(portalAuthServiceMock.resetPassword).toHaveBeenCalledWith(
      'token-valido',
      'NuevaPass123!',
    );
    expect(component.success()).toBe(true);

    jest.advanceTimersByTime(1500);
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/portal/login');
    jest.useRealTimers();
  });

  it('en fallo de negocio (token expirado/reusado) muestra el mensaje de error', async () => {
    await configure('token-valido');
    portalAuthServiceMock.resetPassword.mockReturnValue(
      of({ success: false, message: 'El enlace no es válido o ya expiró.' }),
    );
    const component = createComponent();

    component.form.setValue({ newPassword: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(component.success()).toBe(false);
    expect(component.errorMessage()).toBe('El enlace no es válido o ya expiró.');
  });

  it('no reenvía si ya hay un submit en curso', async () => {
    await configure('token-valido');
    const component = createComponent();
    component.isSubmitting.set(true);

    component.form.setValue({ newPassword: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(portalAuthServiceMock.resetPassword).not.toHaveBeenCalled();
  });
});
