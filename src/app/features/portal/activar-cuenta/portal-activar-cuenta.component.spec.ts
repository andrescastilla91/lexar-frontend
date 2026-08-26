import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PortalActivarCuentaComponent } from './portal-activar-cuenta.component';
import { PortalAuthService } from '../../../core/services/portal-auth.service';

describe('PortalActivarCuentaComponent', () => {
  let portalAuthServiceMock: { acceptInvitation: jest.Mock };
  let navigateByUrlSpy: jest.SpyInstance;

  function configure(queryToken: string | null) {
    portalAuthServiceMock = { acceptInvitation: jest.fn() };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => queryToken } },
    };

    return TestBed.configureTestingModule({
      imports: [PortalActivarCuentaComponent],
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
    const fixture = TestBed.createComponent(PortalActivarCuentaComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('sin token en la URL, no permite enviar el formulario', async () => {
    await configure(null);
    const component = createComponent();

    expect(component.token()).toBeNull();

    component.form.setValue({ password: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(portalAuthServiceMock.acceptInvitation).not.toHaveBeenCalled();
  });

  it('si las contraseñas no coinciden, el formulario es inválido y no llama al servicio', async () => {
    await configure('token-valido');
    const component = createComponent();

    component.form.setValue({ password: 'NuevaPass123!', confirmPassword: 'OtraCosa456!' });
    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(portalAuthServiceMock.acceptInvitation).not.toHaveBeenCalled();
  });

  it('con token y contraseñas coincidentes, en éxito marca success y redirige a procesos', async () => {
    jest.useFakeTimers();
    await configure('token-valido');
    portalAuthServiceMock.acceptInvitation.mockReturnValue(of({ success: true }));
    const component = createComponent();

    component.form.setValue({ password: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(portalAuthServiceMock.acceptInvitation).toHaveBeenCalledWith(
      'token-valido',
      'NuevaPass123!',
    );
    expect(component.success()).toBe(true);

    jest.advanceTimersByTime(1500);
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/portal/procesos');
    jest.useRealTimers();
  });

  it('en fallo de negocio (token usado/expirado) muestra el mensaje de error', async () => {
    await configure('token-valido');
    portalAuthServiceMock.acceptInvitation.mockReturnValue(
      of({ success: false, message: 'El enlace ya fue usado.' }),
    );
    const component = createComponent();

    component.form.setValue({ password: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(component.success()).toBe(false);
    expect(component.errorMessage()).toBe('El enlace ya fue usado.');
  });

  it('no reenvía si ya hay un submit en curso', async () => {
    await configure('token-valido');
    const component = createComponent();
    component.isSubmitting.set(true);

    component.form.setValue({ password: 'NuevaPass123!', confirmPassword: 'NuevaPass123!' });
    component.onSubmit();

    expect(portalAuthServiceMock.acceptInvitation).not.toHaveBeenCalled();
  });
});
