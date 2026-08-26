import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { portalAuthGuard } from './portal-auth.guard';
import { PortalAuthService } from '../services/portal-auth.service';

describe('portalAuthGuard', () => {
  let portalAuthServiceMock: { isAuthenticated: jest.Mock };
  let routerMock: { createUrlTree: jest.Mock };

  beforeEach(() => {
    portalAuthServiceMock = { isAuthenticated: jest.fn() };
    routerMock = { createUrlTree: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: PortalAuthService, useValue: portalAuthServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  function runGuard(url: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      portalAuthGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('permite el acceso cuando el cliente del portal está autenticado', () => {
    portalAuthServiceMock.isAuthenticated.mockReturnValue(true);
    expect(runGuard('/portal/procesos')).toBe(true);
  });

  it('redirige a portal/login con el returnUrl cuando no hay sesión de portal', () => {
    portalAuthServiceMock.isAuthenticated.mockReturnValue(false);
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard('/portal/procesos/p1');

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/portal/login'], {
      queryParams: { returnUrl: '/portal/procesos/p1' },
    });
    expect(result).toBe(urlTree);
  });
});
