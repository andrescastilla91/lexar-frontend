import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { twoFactorRequiredGuard } from './two-factor-required.guard';
import { AuthService } from '../services/auth.service';
import { AuthUser } from '../models/auth.model';

describe('twoFactorRequiredGuard', () => {
  let authServiceMock: { currentUser: ReturnType<typeof signal<AuthUser | null>> };
  let routerMock: { createUrlTree: jest.Mock };

  function configure(user: AuthUser | null): void {
    authServiceMock = { currentUser: signal(user) };
    routerMock = { createUrlTree: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  }

  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => twoFactorRequiredGuard({} as never, {} as never)) as
      | boolean
      | UrlTree;
  }

  it('permite el acceso si la empresa no exige 2FA', () => {
    configure({ email: 'user@bufete.com', roles: [], permissions: [], companyRequire2fa: false, twoFactorEnabled: false });

    expect(runGuard()).toBe(true);
  });

  it('permite el acceso si el usuario ya tiene 2FA activo aunque la empresa lo exija', () => {
    configure({ email: 'user@bufete.com', roles: [], permissions: [], companyRequire2fa: true, twoFactorEnabled: true });

    expect(runGuard()).toBe(true);
  });

  it('redirige a /activar-2fa si la empresa lo exige y el usuario no lo tiene activo', () => {
    configure({ email: 'user@bufete.com', roles: [], permissions: [], companyRequire2fa: true, twoFactorEnabled: false });
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard();

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/activar-2fa']);
    expect(result).toBe(urlTree);
  });

  it('permite el acceso si aún no se conoce companyRequire2fa (undefined, perfil sin cargar)', () => {
    configure({ email: 'user@bufete.com', roles: [], permissions: [] });

    expect(runGuard()).toBe(true);
  });
});
