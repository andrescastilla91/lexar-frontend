import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../core/services/auth.service';
import { PermissionsService } from '../core/services/permissions.service';
import { ProfileService } from '../core/services/profile.service';
import { CompanyService } from '../core/services/company.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { ThemeService } from '../core/services/theme.service';
import { AuthUser } from '../core/models/auth.model';
import { Entitlements } from '../core/models/subscription-backend.model';

describe('MainLayoutComponent — banner de impersonación (F9)', () => {
  let authServiceMock: {
    currentUser: ReturnType<typeof signal<AuthUser | null>>;
    logout: jest.Mock;
    exitImpersonation: jest.Mock;
  };
  let navigateSpy: jest.SpyInstance;

  function configure(user: AuthUser | null): void {
    authServiceMock = {
      currentUser: signal(user),
      logout: jest.fn().mockReturnValue(of(undefined)),
      exitImpersonation: jest.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: PermissionsService, useValue: { hasAnyPermission: jest.fn().mockReturnValue(true), hasPermission: jest.fn().mockReturnValue(false) } },
        { provide: ProfileService, useValue: { updateMe: jest.fn().mockReturnValue(of(undefined)) } },
        { provide: CompanyService, useValue: { getCompany: jest.fn().mockReturnValue(of(null)) } },
        {
          provide: SubscriptionService,
          useValue: { getEntitlements: jest.fn().mockReturnValue(of({ features: { chatbot: false } } as Entitlements)) },
        },
        { provide: ThemeService, useValue: { theme: jest.fn().mockReturnValue('light'), toggle: jest.fn() } },
      ],
    });

    const router = TestBed.inject(Router);
    navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  function createComponent() {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('muestra el banner de impersonación cuando currentUser().impersonating es true', () => {
    configure({ email: 'admin@bufete.com', roles: ['ADMIN'], permissions: [], impersonating: true });
    const { fixture } = createComponent();

    const banner = fixture.nativeElement.querySelector('.bg-danger');
    expect(banner?.textContent).toContain('impersonación');
  });

  it('no muestra el banner para una sesión normal', () => {
    configure({ email: 'admin@bufete.com', roles: ['ADMIN'], permissions: [] });
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelector('.bg-danger')).toBeNull();
  });

  it('exitImpersonation() llama al servicio y navega a /admin/tenants', () => {
    configure({ email: 'admin@bufete.com', roles: ['ADMIN'], permissions: [], impersonating: true });
    const { component } = createComponent();

    component.exitImpersonation();

    expect(authServiceMock.exitImpersonation).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/tenants']);
  });

  it('exitImpersonation() navega igual si el servicio falla', () => {
    configure({ email: 'admin@bufete.com', roles: ['ADMIN'], permissions: [], impersonating: true });
    authServiceMock.exitImpersonation.mockReturnValue(throwError(() => new Error('fail')));
    const { component } = createComponent();

    component.exitImpersonation();

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/tenants']);
  });
});
