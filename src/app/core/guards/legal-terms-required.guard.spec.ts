import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { legalTermsRequiredGuard } from './legal-terms-required.guard';
import { AuthService } from '../services/auth.service';
import { AuthUser } from '../models/auth.model';

describe('legalTermsRequiredGuard', () => {
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
    return TestBed.runInInjectionContext(() => legalTermsRequiredGuard({} as never, {} as never)) as
      | boolean
      | UrlTree;
  }

  it('permite el acceso si no tiene términos pendientes', () => {
    configure({ email: 'user@bufete.com', roles: [], permissions: [], legalTermsPending: false });

    expect(runGuard()).toBe(true);
  });

  it('redirige a /aceptar-terminos si tiene términos pendientes', () => {
    configure({ email: 'user@bufete.com', roles: [], permissions: [], legalTermsPending: true });
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard();

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/aceptar-terminos']);
    expect(result).toBe(urlTree);
  });

  it('permite el acceso si aún no se conoce legalTermsPending (undefined, perfil sin cargar)', () => {
    configure({ email: 'user@bufete.com', roles: [], permissions: [] });

    expect(runGuard()).toBe(true);
  });
});
