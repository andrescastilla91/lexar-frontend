import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { portalLegalTermsRequiredGuard } from './portal-legal-terms-required.guard';
import { PortalAuthService } from '../services/portal-auth.service';
import { PortalUser } from '../models/portal.model';

describe('portalLegalTermsRequiredGuard', () => {
  let routerMock: { createUrlTree: jest.Mock };

  function configure(user: PortalUser | null): void {
    routerMock = { createUrlTree: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: PortalAuthService, useValue: { currentPortalUser: signal(user) } },
        { provide: Router, useValue: routerMock },
      ],
    });
  }

  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => portalLegalTermsRequiredGuard({} as never, {} as never)) as
      | boolean
      | UrlTree;
  }

  it('permite el acceso si no tiene términos del portal pendientes', () => {
    configure({ id: 'pu-1', email: 'cliente@x.com', clientId: 'c1', legalTermsPending: false });

    expect(runGuard()).toBe(true);
  });

  it('redirige a /portal/aceptar-terminos si tiene términos pendientes', () => {
    configure({ id: 'pu-1', email: 'cliente@x.com', clientId: 'c1', legalTermsPending: true });
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard();

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/portal/aceptar-terminos']);
    expect(result).toBe(urlTree);
  });

  it('permite el acceso si aún no se conoce legalTermsPending (undefined)', () => {
    configure({ id: 'pu-1', email: 'cliente@x.com', clientId: 'c1' });

    expect(runGuard()).toBe(true);
  });

  it('permite el acceso sin usuario cargado (portalAuthGuard ya se encarga de la sesión)', () => {
    configure(null);

    expect(runGuard()).toBe(true);
  });
});
