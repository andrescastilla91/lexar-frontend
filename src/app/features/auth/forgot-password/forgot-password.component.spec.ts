import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ForgotPasswordComponent', () => {
  let authServiceMock: { forgotPassword: jest.Mock };

  beforeEach(async () => {
    authServiceMock = { forgotPassword: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('no llama al servicio si el email es inválido', () => {
    const component = createComponent();
    component.form.setValue({ email: 'no-es-un-correo' });

    component.onSubmit();

    expect(authServiceMock.forgotPassword).not.toHaveBeenCalled();
    expect(component.form.get('email')?.touched).toBe(true);
  });

  it('en éxito muestra el mensaje genérico sin importar si el correo existe', () => {
    authServiceMock.forgotPassword.mockReturnValue(
      of({ success: true, message: 'Si el correo existe...' }),
    );
    const component = createComponent();
    component.form.setValue({ email: 'usuario@lexar.com' });

    component.onSubmit();

    expect(authServiceMock.forgotPassword).toHaveBeenCalledWith('usuario@lexar.com');
    expect(component.submitted()).toBe(true);
    expect(component.isSubmitting()).toBe(false);
  });

  it('en fallo de negocio muestra el mensaje de error', () => {
    authServiceMock.forgotPassword.mockReturnValue(
      of({ success: false, message: 'Demasiadas solicitudes' }),
    );
    const component = createComponent();
    component.form.setValue({ email: 'usuario@lexar.com' });

    component.onSubmit();

    expect(component.submitted()).toBe(false);
    expect(component.errorMessage()).toBe('Demasiadas solicitudes');
  });

  it('ignora un segundo submit mientras el primero está en curso', () => {
    authServiceMock.forgotPassword.mockReturnValue(of({ success: true }));
    const component = createComponent();
    component.form.setValue({ email: 'usuario@lexar.com' });
    component.isSubmitting.set(true);

    component.onSubmit();

    expect(authServiceMock.forgotPassword).not.toHaveBeenCalled();
  });
});
