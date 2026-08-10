import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { emailVerifiedGuard } from './email-verified.guard';
import { AuthService } from '../services/auth.service';
import { AuthUser } from '../models/auth.model';

describe('emailVerifiedGuard', () => {
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
    return TestBed.runInInjectionContext(() => emailVerifiedGuard({} as never, {} as never)) as
      | boolean
      | UrlTree;
  }

  it('permite el acceso si el usuario no es el dueño de la empresa', () => {
    configure({ email: 'invitado@bufete.com', roles: [], permissions: [], isOwner: false, emailVerified: false });

    expect(runGuard()).toBe(true);
  });

  it('permite el acceso si el dueño ya verificó su correo', () => {
    configure({ email: 'admin@bufete.com', roles: [], permissions: [], isOwner: true, emailVerified: true });

    expect(runGuard()).toBe(true);
  });

  it('redirige a /verificar-pendiente si el dueño no ha verificado su correo', () => {
    configure({ email: 'admin@bufete.com', roles: [], permissions: [], isOwner: true, emailVerified: false });
    const urlTree = {} as UrlTree;
    routerMock.createUrlTree.mockReturnValue(urlTree);

    const result = runGuard();

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/verificar-pendiente']);
    expect(result).toBe(urlTree);
  });

  it('permite el acceso si aún no se conoce emailVerified (undefined, perfil sin cargar)', () => {
    configure({ email: 'admin@bufete.com', roles: [], permissions: [], isOwner: true });

    expect(runGuard()).toBe(true);
  });
});
