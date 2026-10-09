import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../core/services/auth.service';
import { AuthUser } from '../core/models/auth.model';
import { SidebarPreferenceService } from './sidebar-preference.service';

describe('SidebarPreferenceService (F48)', () => {
  const currentUser = signal<AuthUser | null>(null);

  function create(): SidebarPreferenceService {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { currentUser } }],
    });
    const service = TestBed.inject(SidebarPreferenceService);
    TestBed.tick();
    return service;
  }

  beforeEach(() => {
    localStorage.clear();
    currentUser.set({ id: 'u1', email: 'a@x.com', roles: [], permissions: [] });
  });

  it('arranca expandido', () => {
    expect(create().collapsed()).toBe(false);
  });

  it('toggle() colapsa y lo guarda con clave por usuario', () => {
    const service = create();

    service.toggle();

    expect(service.collapsed()).toBe(true);
    expect(localStorage.getItem('lexar-sidebar-collapsed:a@x.com')).toBe('true');
  });

  it('restaura la preferencia guardada al iniciar', () => {
    localStorage.setItem('lexar-sidebar-collapsed:a@x.com', 'true');

    expect(create().collapsed()).toBe(true);
  });

  it('la preferencia de un usuario no afecta a otro', () => {
    localStorage.setItem('lexar-sidebar-collapsed:a@x.com', 'true');
    const service = create();

    currentUser.set({ id: 'u2', email: 'b@x.com', roles: [], permissions: [] });
    TestBed.tick();

    expect(service.collapsed()).toBe(false);
  });

  it('la clave es estable con o sin id (login trae id, /auth/me no) — regresión de recarga', () => {
    const service = create();
    service.toggle();

    currentUser.set({ email: 'A@x.com', roles: [], permissions: [] });
    TestBed.tick();

    expect(service.collapsed()).toBe(true);
    expect(localStorage.getItem('lexar-sidebar-collapsed:a@x.com')).toBe('true');
  });

  it('sin usuario no persiste nada', () => {
    currentUser.set(null);
    const service = create();

    service.toggle();

    expect(localStorage.length).toBe(0);
  });

  it('si el almacenamiento falla, igual alterna en memoria', () => {
    const service = create();
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() => service.toggle()).not.toThrow();
    expect(service.collapsed()).toBe(true);
    jest.restoreAllMocks();
  });
});
