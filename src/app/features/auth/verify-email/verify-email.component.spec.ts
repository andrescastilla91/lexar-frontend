import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VerifyEmailComponent } from './verify-email.component';
import { AuthService } from '../../../core/services/auth.service';

describe('VerifyEmailComponent', () => {
  let authServiceMock: { verifyEmail: jest.Mock };

  function configure(token: string | null): void {
    authServiceMock = { verifyEmail: jest.fn().mockReturnValue(of({ success: true })) };

    TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } },
        },
      ],
    });

    const router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  }

  function createComponent() {
    const fixture = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('sin token en la URL muestra el estado missing-token', () => {
    configure(null);
    const { component } = createComponent();

    expect(component.state()).toBe('missing-token');
    expect(authServiceMock.verifyEmail).not.toHaveBeenCalled();
  });

  it('con token válido llama al servicio y marca success', () => {
    configure('token-123');
    const { component } = createComponent();

    expect(authServiceMock.verifyEmail).toHaveBeenCalledWith('token-123');
    expect(component.state()).toBe('success');
  });

  it('con token inválido marca error y expone el mensaje', () => {
    configure('token-malo');
    authServiceMock.verifyEmail.mockReturnValue(of({ success: false, message: 'El enlace es inválido o ya expiró' }));
    const { component } = createComponent();

    expect(component.state()).toBe('error');
    expect(component.errorMessage()).toBe('El enlace es inválido o ya expiró');
  });
});
