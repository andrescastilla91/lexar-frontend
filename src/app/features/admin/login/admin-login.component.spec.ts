import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminLoginComponent } from './admin-login.component';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';

describe('AdminLoginComponent', () => {
  let platformAdminServiceMock: { login: jest.Mock; isAuthenticated: jest.Mock };
  let navigateSpy: jest.SpyInstance;
  let navigateByUrlSpy: jest.SpyInstance;

  function configure(returnUrl: string | null = null): void {
    platformAdminServiceMock = {
      login: jest.fn(),
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

  it('en éxito navega a returnUrl si existe, o a /admin/tenants por defecto', () => {
    configure('/admin/plans');
    platformAdminServiceMock.login.mockReturnValue(of({ email: 'admin@lexar.com' }));
    const component = createComponent();
    component.form.setValue({ email: 'admin@lexar.com', password: 'secret123' });

    component.onSubmit();

    expect(platformAdminServiceMock.login).toHaveBeenCalledWith('admin@lexar.com', 'secret123');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/admin/plans');
    expect(component.isSubmitting()).toBe(false);
  });

  it('en error muestra el mensaje y libera isSubmitting', () => {
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
});
