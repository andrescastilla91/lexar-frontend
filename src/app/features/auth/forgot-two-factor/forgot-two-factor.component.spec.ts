import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ForgotTwoFactorComponent } from './forgot-two-factor.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ForgotTwoFactorComponent', () => {
  let authServiceMock: { forgotTwoFactor: jest.Mock };

  beforeEach(async () => {
    authServiceMock = { forgotTwoFactor: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ForgotTwoFactorComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(ForgotTwoFactorComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('no llama al servicio si el email es inválido', () => {
    const component = createComponent();
    component.form.setValue({ email: 'no-es-un-correo' });

    component.onSubmit();

    expect(authServiceMock.forgotTwoFactor).not.toHaveBeenCalled();
    expect(component.form.get('email')?.touched).toBe(true);
  });

  it('en éxito muestra el mensaje genérico sin importar si el correo existe o tiene 2FA', () => {
    authServiceMock.forgotTwoFactor.mockReturnValue(
      of({ success: true, message: 'Si el correo existe...' }),
    );
    const component = createComponent();
    component.form.setValue({ email: 'usuario@lexar.com' });

    component.onSubmit();

    expect(authServiceMock.forgotTwoFactor).toHaveBeenCalledWith('usuario@lexar.com');
    expect(component.submitted()).toBe(true);
    expect(component.isSubmitting()).toBe(false);
  });

  it('en fallo de negocio muestra el mensaje de error', () => {
    authServiceMock.forgotTwoFactor.mockReturnValue(
      of({ success: false, message: 'Demasiadas solicitudes' }),
    );
    const component = createComponent();
    component.form.setValue({ email: 'usuario@lexar.com' });

    component.onSubmit();

    expect(component.submitted()).toBe(false);
    expect(component.errorMessage()).toBe('Demasiadas solicitudes');
  });

  it('ignora un segundo submit mientras el primero está en curso', () => {
    authServiceMock.forgotTwoFactor.mockReturnValue(of({ success: true }));
    const component = createComponent();
    component.form.setValue({ email: 'usuario@lexar.com' });
    component.isSubmitting.set(true);

    component.onSubmit();

    expect(authServiceMock.forgotTwoFactor).not.toHaveBeenCalled();
  });
});
