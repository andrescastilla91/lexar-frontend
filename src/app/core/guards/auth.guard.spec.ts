import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authServiceMock: { isAuthenticated: jest.Mock };
  let routerMock: { createUrlTree: jest.Mock };

  beforeEach(() => {
    authServiceMock = { isAuthenticated: jest.fn() };
    routerMock = { createUrlTree: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  function runGuard(url: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('permite el acceso cuando el usuario está autenticado', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);

    expect(runGuard('/dashboard')).toBe(true);
  });

  it('redirige a login con el returnUrl cuando no hay sesión', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard('/clientes');

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/clientes' },
    });
    expect(result).toBe(urlTree);
  });
});
