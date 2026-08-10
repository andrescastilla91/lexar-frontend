import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { platformAdminGuard } from './platform-admin.guard';
import { PlatformAdminService } from '../services/platform-admin.service';

describe('platformAdminGuard', () => {
  let platformAdminServiceMock: { isAuthenticated: jest.Mock };
  let routerMock: { createUrlTree: jest.Mock };

  beforeEach(() => {
    platformAdminServiceMock = { isAuthenticated: jest.fn() };
    routerMock = { createUrlTree: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformAdminService, useValue: platformAdminServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  function runGuard(url: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      platformAdminGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('permite el acceso cuando hay sesión de platform admin', () => {
    platformAdminServiceMock.isAuthenticated.mockReturnValue(true);

    expect(runGuard('/admin/tenants')).toBe(true);
  });

  it('redirige a /admin/login con el returnUrl cuando no hay sesión', () => {
    platformAdminServiceMock.isAuthenticated.mockReturnValue(false);
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard('/admin/plans');

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/admin/login'], {
      queryParams: { returnUrl: '/admin/plans' },
    });
    expect(result).toBe(urlTree);
  });
});
