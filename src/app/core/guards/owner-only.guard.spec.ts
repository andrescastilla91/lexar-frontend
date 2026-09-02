import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { ownerOnlyGuard } from './owner-only.guard';
import { AuthService } from '../services/auth.service';
import { AuthUser } from '../models/auth.model';

describe('ownerOnlyGuard', () => {
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
    return TestBed.runInInjectionContext(() => ownerOnlyGuard({} as never, {} as never)) as boolean | UrlTree;
  }

  it('permite el acceso si el usuario es el dueño de la empresa', () => {
    configure({ email: 'admin@bufete.com', roles: [], permissions: [], isOwner: true });

    expect(runGuard()).toBe(true);
  });

  it('redirige a /dashboard si el usuario no es el dueño', () => {
    configure({ email: 'invitado@bufete.com', roles: [], permissions: [], isOwner: false });
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard();

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toBe(urlTree);
  });

  it('redirige a /dashboard si aún no se conoce isOwner (undefined, perfil sin cargar)', () => {
    configure({ email: 'admin@bufete.com', roles: [], permissions: [] });
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard();

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toBe(urlTree);
  });

  it('redirige a /dashboard si no hay usuario en sesión', () => {
    configure(null);
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard();

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    expect(result).toBe(urlTree);
  });
});
