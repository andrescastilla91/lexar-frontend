import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../core/services/auth.service';
import { PermissionsService } from '../core/services/permissions.service';
import { ProfileService } from '../core/services/profile.service';
import { CompanyService } from '../core/services/company.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { ThemeService } from '../core/services/theme.service';
import { ToastService } from '../core/services/toast.service';
import { NotificationsService } from '../core/services/notifications.service';
import { AuthUser } from '../core/models/auth.model';
import { Entitlements } from '../core/models/subscription-backend.model';
import { MENU_ICONS } from './menu-icons';

describe('MainLayoutComponent — banner de impersonación (F9)', () => {
  let authServiceMock: {
    currentUser: ReturnType<typeof signal<AuthUser | null>>;
    logout: jest.Mock;
    exitImpersonation: jest.Mock;
    resendVerification: jest.Mock;
  };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock; toasts: jest.Mock };
  let navigateSpy: jest.SpyInstance;

  function configure(
    user: AuthUser | null,
    hasAnyPermission: (permissions: string[]) => boolean = () => true,
    chatbot = false,
  ): void {
    authServiceMock = {
      currentUser: signal(user),
      logout: jest.fn().mockReturnValue(of(undefined)),
      exitImpersonation: jest.fn().mockReturnValue(of(undefined)),
      resendVerification: jest.fn().mockReturnValue(of({ success: true })),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn(), toasts: jest.fn().mockReturnValue([]) };

    TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: PermissionsService, useValue: { hasAnyPermission: jest.fn().mockImplementation(hasAnyPermission), hasPermission: jest.fn().mockReturnValue(false) } },
        { provide: ProfileService, useValue: { updateMe: jest.fn().mockReturnValue(of(undefined)) } },
        { provide: CompanyService, useValue: { getCompany: jest.fn().mockReturnValue(of(null)) } },
        {
          provide: SubscriptionService,
          useValue: { getEntitlements: jest.fn().mockReturnValue(of({ features: { chatbot } } as Entitlements)) },
        },
        { provide: ThemeService, useValue: { theme: jest.fn().mockReturnValue('light'), toggle: jest.fn() } },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: NotificationsService,
          useValue: {
            connectStream: jest.fn(),
            disconnectStream: jest.fn(),
            unreadCount: signal(0),
            latestNotifications: signal([]),
            markAllRead: jest.fn().mockReturnValue(of(undefined)),
            markRead: jest.fn().mockReturnValue(of(undefined)),
          },
        },
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

  // Bug corregido 2026-08-05: el <aside> no tenía `shrink-0` y el contenedor
  // de contenido no tenía `min-w-0`, así que un contenido ancho (ej. la
  // tabla de asesores) hacía que el navegador encogiera el sidebar en vez
  // de dejar que el contenido generara su propio scroll horizontal. jsdom
  // no calcula flexbox real, así que este test solo puede verificar que las
  // clases siguen presentes (guarda barata) — la verificación visual real
  // vive en el test de Playwright a nivel de viewport.
  it('el aside mantiene un ancho fijo (shrink-0) y el contenedor de contenido puede encogerse (min-w-0)', () => {
    configure({ email: 'admin@bufete.com', roles: ['ADMIN'], permissions: [] });
    const { fixture } = createComponent();

    const aside = fixture.nativeElement.querySelector('aside');
    const contentColumn = aside?.nextElementSibling;

    expect(aside?.className).toContain('shrink-0');
    expect(contentColumn?.className).toContain('min-w-0');
  });

  // BUG-32: iconos con el path cortado o de otro dominio, y la entrada del
  // asistente con su nombre viejo.
  describe('menú lateral (BUG-32)', () => {
    const iconValues: string[] = Object.values(MENU_ICONS);

    it('cada ítem usa un icono del catálogo y ninguno se repite', () => {
      configure({ email: 'admin@bufete.com', roles: ['ADMIN'], permissions: [] });
      const { component } = createComponent();

      const icons = component.menuItems.map((item) => item.icon);
      for (const icon of icons) {
        expect(iconValues).toContain(icon);
      }
      expect(new Set(icons).size).toBe(icons.length);
      expect(icons).toHaveLength(iconValues.length);
    });

    it('la entrada del asistente se llama Lexi y ya no «Chatbot»', () => {
      configure({ email: 'admin@bufete.com', roles: ['ADMIN'], permissions: [] });
      const { component } = createComponent();

      const labels = component.menuItems.map((item) => item.label);
      expect(labels).toContain('Lexi');
      expect(labels).not.toContain('Chatbot');
      expect(component.menuItems.find((item) => item.label === 'Lexi')?.route).toBe('/chatbot');
    });

    it('el menú pinta el path completo de cada ítem visible', () => {
      configure({ email: 'admin@bufete.com', roles: ['ADMIN'], permissions: [] });
      const { fixture, component } = createComponent();

      const rendered = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('aside nav a svg path'),
      ).map((path) => path.getAttribute('d'));
      for (const item of component.filteredMenuItems()) {
        expect(rendered).toContain(item.icon);
      }
    });
  });

  describe('menú lateral (F48)', () => {
    const admin: AuthUser = { email: 'admin@bufete.com', roles: ['ADMIN'], permissions: [] };
    const headings = (root: HTMLElement) =>
      Array.from(root.querySelectorAll('aside nav p')).map((p) => p.textContent?.trim());

    it('agrupa el menú de un administrador por dominio, con Configuración en Administración', () => {
      configure(admin);
      const { fixture } = createComponent();
      const root = fixture.nativeElement as HTMLElement;

      expect(headings(root)).toEqual(['Trabajo', 'Administración']);
      expect(root.querySelector('aside nav a[data-menu-route="/configuracion"]')).not.toBeNull();
    });

    it('el grupo Asistencia solo aparece cuando el plan incluye Lexi', () => {
      configure(admin, () => true, true);
      const { fixture } = createComponent();
      const root = fixture.nativeElement as HTMLElement;

      expect(headings(root)).toEqual(['Trabajo', 'Asistencia', 'Administración']);
      expect(root.querySelector('aside nav a[data-menu-route="/chatbot"]')).not.toBeNull();
    });

    it('un rol sin permisos administrativos no ve el grupo Administración ni su encabezado', () => {
      const workOnly = ['clients.list', 'legal_processes.list', 'deadlines.view', 'tasks.view', 'files.view'];
      configure(admin, (permissions) => permissions.some((permission) => workOnly.includes(permission)));
      const { fixture } = createComponent();
      const root = fixture.nativeElement as HTMLElement;

      expect(headings(root)).toEqual(['Trabajo']);
      expect(root.querySelector('aside nav a[data-menu-route="/usuarios"]')).toBeNull();
      expect(root.querySelector('aside nav a[data-menu-route="/configuracion"]')).toBeNull();
    });

    it('sin ningún permiso solo queda Dashboard, sin encabezados vacíos', () => {
      configure(admin, () => false);
      const { fixture } = createComponent();
      const root = fixture.nativeElement as HTMLElement;

      expect(headings(root)).toEqual([]);
      expect(Array.from(root.querySelectorAll('aside nav a')).map((a) => a.getAttribute('data-menu-route'))).toEqual([
        '/dashboard',
      ]);
    });

    it('colapsar desde el menú persiste y el layout lo refleja', () => {
      localStorage.clear();
      configure({ ...admin, id: 'u-1' });
      const { fixture } = createComponent();
      const root = fixture.nativeElement as HTMLElement;

      root.querySelector<HTMLButtonElement>('aside button[aria-label="Contraer menú"]')!.click();
      fixture.detectChanges();

      expect(root.querySelector('aside')?.className).toContain('lg:w-16');
      expect(localStorage.getItem('lexar-sidebar-collapsed:admin@bufete.com')).toBe('true');
    });

    it('arranca colapsado si el usuario ya lo había dejado así', () => {
      localStorage.setItem('lexar-sidebar-collapsed:admin@bufete.com', 'true');
      configure({ ...admin, id: 'u-2' });
      const { fixture } = createComponent();

      expect(fixture.nativeElement.querySelector('aside')?.className).toContain('lg:w-16');
      localStorage.clear();
    });
  });

  describe('título del encabezado', () => {
    const admin: AuthUser = { email: 'admin@bufete.com', roles: ['ADMIN'], permissions: [] };

    async function openAt(url: string) {
      configure(admin);
      const router = TestBed.inject(Router);
      router.resetConfig([{ path: '**', children: [] }]);
      const { fixture, component } = createComponent();
      await TestBed.inject(Router).navigateByUrl(url);
      fixture.detectChanges();
      const header = (fixture.nativeElement as HTMLElement).querySelector('header')!;
      return { fixture, component, header };
    }

    it('ya no muestra la frase genérica «Panel central»', async () => {
      const { header } = await openAt('/usuarios');

      expect(header.textContent).not.toContain('Panel central');
    });

    it('muestra el grupo de la sección como texto secundario, solo desde sm', async () => {
      const { header } = await openAt('/usuarios');

      const group = Array.from(header.querySelectorAll('p')).find((p) => p.textContent?.trim() === 'Administración');
      expect(group?.className).toContain('hidden');
      expect(group?.className).toContain('sm:block');
    });

    it('el título va en una sola línea: truncado y sin romper el ancho de la fila', async () => {
      const { component, header } = await openAt('/clientes');

      const title = Array.from(header.querySelectorAll('p')).find((p) => p.textContent?.trim() === 'Clientes');
      expect(component.activeRouteLabel()).toBe('Clientes');
      expect(title?.className).toContain('truncate');
      expect(title?.parentElement?.className).toContain('min-w-0');
    });

    it('el Dashboard no tiene grupo, así que no pinta texto secundario', async () => {
      const { component, header } = await openAt('/dashboard');

      expect(component.activeGroupLabel()).toBeNull();
      expect(header.querySelectorAll('p.sm\\:block')).toHaveLength(0);
    });

    it('Configuración muestra el grupo Administración', async () => {
      const { component } = await openAt('/configuracion');

      expect(component.activeRouteLabel()).toBe('Configuración');
      expect(component.activeGroupLabel()).toBe('Administración');
    });

    it('en una ruta que no está en el menú el título cae a «Panel central» y sin grupo', async () => {
      const { component } = await openAt('/perfil');

      expect(component.activeRouteLabel()).toBe('Panel central');
      expect(component.activeGroupLabel()).toBeNull();
    });
  });
});
