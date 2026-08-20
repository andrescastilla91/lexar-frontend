import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalLoginComponent } from './portal-login.component';
import { PortalAuthService } from '../../../core/services/portal-auth.service';

describe('PortalLoginComponent', () => {
  let portalAuthServiceMock: { isAuthenticated: jest.Mock; login: jest.Mock };
  let navigateSpy: jest.SpyInstance;
  let navigateByUrlSpy: jest.SpyInstance;

  function configure(returnUrl: string | null = null, authenticated = false) {
    portalAuthServiceMock = {
      isAuthenticated: jest.fn().mockReturnValue(authenticated),
      login: jest.fn(),
    };

    const activatedRouteMock = {
      snapshot: { queryParamMap: { get: () => returnUrl } },
    };

    return TestBed.configureTestingModule({
      imports: [PortalLoginComponent],
      providers: [
        provideRouter([]),
        { provide: PortalAuthService, useValue: portalAuthServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    })
      .compileComponents()
      .then(() => {
        const router = TestBed.inject(Router);
        navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        navigateByUrlSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(PortalLoginComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('si ya hay sesión activa, redirige a procesos al iniciar', async () => {
    await configure(null, true);
    createComponent();

    expect(navigateSpy).toHaveBeenCalledWith(['/portal/procesos']);
  });

  it('si el formulario es inválido, no llama al servicio', async () => {
    await configure();
    const component = createComponent();

    component.onSubmit();

    expect(portalAuthServiceMock.login).not.toHaveBeenCalled();
    expect(component.form.get('email')?.touched).toBe(true);
  });

  it('login exitoso sin returnUrl redirige a /portal/procesos', async () => {
    await configure(null);
    portalAuthServiceMock.login.mockReturnValue(of({ success: true }));
    const component = createComponent();

    component.form.setValue({ email: 'cliente@x.com', password: 'Passw0rd!' });
    component.onSubmit();

    expect(portalAuthServiceMock.login).toHaveBeenCalledWith('cliente@x.com', 'Passw0rd!');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/portal/procesos');
  });

  it('login exitoso con returnUrl válido redirige ahí en lugar del fallback', async () => {
    await configure('/portal/procesos/p1');
    portalAuthServiceMock.login.mockReturnValue(of({ success: true }));
    const component = createComponent();

    component.form.setValue({ email: 'cliente@x.com', password: 'Passw0rd!' });
    component.onSubmit();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/portal/procesos/p1');
  });

  it('si el returnUrl es /portal/login, ignora el bucle y usa el fallback', async () => {
    await configure('/portal/login');
    portalAuthServiceMock.login.mockReturnValue(of({ success: true }));
    const component = createComponent();

    component.form.setValue({ email: 'cliente@x.com', password: 'Passw0rd!' });
    component.onSubmit();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/portal/procesos');
  });

  it('login fallido de negocio muestra el mensaje del backend', async () => {
    await configure();
    portalAuthServiceMock.login.mockReturnValue(
      of({ success: false, message: 'Credenciales inválidas' }),
    );
    const component = createComponent();

    component.form.setValue({ email: 'cliente@x.com', password: 'mala' });
    component.onSubmit();

    expect(component.errorMessage()).toBe('Credenciales inválidas');
    expect(component.isSubmitting()).toBe(false);
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('error de red muestra un mensaje y libera isSubmitting', async () => {
    await configure();
    portalAuthServiceMock.login.mockReturnValue(throwError(() => new Error('offline')));
    const component = createComponent();

    component.form.setValue({ email: 'cliente@x.com', password: 'Passw0rd!' });
    component.onSubmit();

    expect(component.errorMessage()).toBe('offline');
    expect(component.isSubmitting()).toBe(false);
  });

  it('no reenvía si ya hay un submit en curso', async () => {
    await configure();
    const component = createComponent();
    component.isSubmitting.set(true);

    component.form.setValue({ email: 'cliente@x.com', password: 'Passw0rd!' });
    component.onSubmit();

    expect(portalAuthServiceMock.login).not.toHaveBeenCalled();
  });
});
