import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ResetPasswordComponent', () => {
  let authServiceMock: { resetPassword: jest.Mock };
  let navigateByUrlSpy: jest.SpyInstance;

  function configure(queryToken: string | null) {
    authServiceMock = { resetPassword: jest.fn() };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => queryToken } },
    };

    return TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
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
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('sin token en la URL, no permite enviar el formulario', async () => {
    await configure(null);
    const component = createComponent();

    expect(component.token()).toBeNull();

    component.form.setValue({ newPassword: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
  });

  it('si las contraseñas no coinciden, el formulario es inválido y no llama al servicio', async () => {
    await configure('token-valido');
    const component = createComponent();

    component.form.setValue({ newPassword: 'NuevaPass123!', confirmPassword: 'OtraCosa456!' });
    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
  });

  it('con token y contraseñas coincidentes, en éxito marca success y redirige', async () => {
    jest.useFakeTimers();
    await configure('token-valido');
    authServiceMock.resetPassword.mockReturnValue(of({ success: true }));
    const component = createComponent();

    component.form.setValue({ newPassword: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(authServiceMock.resetPassword).toHaveBeenCalledWith('token-valido', 'NuevaPass123!');
    expect(component.success()).toBe(true);

    jest.advanceTimersByTime(3000);
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/login');
    jest.useRealTimers();
  });

  it('en fallo de negocio (token expirado/reusado) muestra el mensaje de error', async () => {
    await configure('token-valido');
    authServiceMock.resetPassword.mockReturnValue(
      of({ success: false, message: 'El enlace no es válido o ya expiró.' }),
    );
    const component = createComponent();

    component.form.setValue({ newPassword: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(component.success()).toBe(false);
    expect(component.errorMessage()).toBe('El enlace no es válido o ya expiró.');
  });
});
