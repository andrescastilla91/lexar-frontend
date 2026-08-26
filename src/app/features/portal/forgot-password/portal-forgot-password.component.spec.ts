import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalForgotPasswordComponent } from './portal-forgot-password.component';
import { PortalAuthService } from '../../../core/services/portal-auth.service';

describe('PortalForgotPasswordComponent', () => {
  let portalAuthServiceMock: { forgotPassword: jest.Mock };

  function configure() {
    portalAuthServiceMock = { forgotPassword: jest.fn() };

    return TestBed.configureTestingModule({
      imports: [PortalForgotPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: PortalAuthService, useValue: portalAuthServiceMock },
      ],
    }).compileComponents();
  }

  function createComponent() {
    const fixture = TestBed.createComponent(PortalForgotPasswordComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('si el correo es inválido, no llama al servicio', async () => {
    await configure();
    const component = createComponent();

    component.form.setValue({ email: 'no-es-correo' });
    component.onSubmit();

    expect(portalAuthServiceMock.forgotPassword).not.toHaveBeenCalled();
    expect(component.form.get('email')?.touched).toBe(true);
  });

  it('en éxito marca submitted (mensaje ciego, sin filtrar si el correo existe)', async () => {
    await configure();
    portalAuthServiceMock.forgotPassword.mockReturnValue(
      of({ success: true, message: 'Si el correo existe...' }),
    );
    const component = createComponent();

    component.form.setValue({ email: 'cliente@x.com' });
    component.onSubmit();

    expect(portalAuthServiceMock.forgotPassword).toHaveBeenCalledWith('cliente@x.com');
    expect(component.submitted()).toBe(true);
    expect(component.isSubmitting()).toBe(false);
  });

  it('en fallo de negocio muestra el mensaje del backend sin marcar submitted', async () => {
    await configure();
    portalAuthServiceMock.forgotPassword.mockReturnValue(
      of({ success: false, message: 'Demasiados intentos, intenta más tarde.' }),
    );
    const component = createComponent();

    component.form.setValue({ email: 'cliente@x.com' });
    component.onSubmit();

    expect(component.submitted()).toBe(false);
    expect(component.errorMessage()).toBe('Demasiados intentos, intenta más tarde.');
  });

  it('error de red muestra un mensaje genérico y libera isSubmitting', async () => {
    await configure();
    portalAuthServiceMock.forgotPassword.mockReturnValue(throwError(() => new Error('offline')));
    const component = createComponent();

    component.form.setValue({ email: 'cliente@x.com' });
    component.onSubmit();

    expect(component.errorMessage()).toBe('Error al conectar con el servidor.');
    expect(component.isSubmitting()).toBe(false);
  });

  it('no reenvía si ya hay un submit en curso', async () => {
    await configure();
    const component = createComponent();
    component.isSubmitting.set(true);

    component.form.setValue({ email: 'cliente@x.com' });
    component.onSubmit();

    expect(portalAuthServiceMock.forgotPassword).not.toHaveBeenCalled();
  });
});
