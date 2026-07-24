import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { signal as ngSignal } from '@angular/core';
import { VerifyRequiredComponent } from './verify-required.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuthUser } from '../../../core/models/auth.model';

describe('VerifyRequiredComponent', () => {
  let authServiceMock: {
    currentUser: ReturnType<typeof ngSignal<AuthUser | null>>;
    resendVerification: jest.Mock;
    logout: jest.Mock;
  };
  let navigateSpy: jest.Mock;

  function configure(): void {
    authServiceMock = {
      currentUser: ngSignal<AuthUser | null>({
        email: 'admin@bufete.com',
        roles: [],
        permissions: [],
        isOwner: true,
        emailVerified: false,
      }),
      resendVerification: jest.fn().mockReturnValue(of({ success: true })),
      logout: jest.fn().mockReturnValue(of(undefined)),
    };
    navigateSpy = jest.fn();

    TestBed.configureTestingModule({
      imports: [VerifyRequiredComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(VerifyRequiredComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => configure());

  it('muestra el correo del usuario actual', () => {
    const { component } = createComponent();

    expect(component.email()).toBe('admin@bufete.com');
  });

  it('resend() en éxito muestra el mensaje de reenvío', () => {
    const { component } = createComponent();

    component.resend();

    expect(authServiceMock.resendVerification).toHaveBeenCalled();
    expect(component.resendSuccess()).toBe(true);
    expect(component.resendMessage()).toContain('nuevo enlace');
  });

  it('resend() en error muestra el mensaje del backend', () => {
    authServiceMock.resendVerification.mockReturnValue(of({ success: false, message: 'No se pudo reenviar' }));
    const { component } = createComponent();

    component.resend();

    expect(component.resendSuccess()).toBe(false);
    expect(component.resendMessage()).toBe('No se pudo reenviar');
  });

  it('logout() cierra sesión y navega a /login', () => {
    const { component } = createComponent();

    component.logout();

    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
