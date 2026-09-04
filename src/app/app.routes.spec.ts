import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Routes, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { LexArTitleStrategy } from './core/services/lexar-title-strategy';

/**
 * F29(b) — ajuste 2026-09-03: cada ruta declara solo su nombre de sección
 * corto (`title: 'Tablero'`); la concatenación con la marca la hace
 * `LexArTitleStrategy` (probada aparte en `lexar-title-strategy.spec.ts`).
 * Dos niveles de verificación acá, a propósito:
 *
 * 1. `routes` reales (sin TestBed): confirma que las rutas de la app
 *    declaran el `title` corto esperado y el `data.titleSuffix` correcto
 *    en los puntos donde aplica — barato, determinista, sin cargar los
 *    componentes lazy reales.
 * 2. `RouterTestingHarness` con una config de rutas mínima (componentes de
 *    prueba triviales) pero con la `LexArTitleStrategy` real registrada
 *    (igual que en `app.config.ts`): prueba el mecanismo end-to-end —
 *    `document.title` termina concatenado con `environment.brandName`, y
 *    una ruta sin `title` no rompe la navegación.
 */
describe('app.routes — título de pestaña por ruta (F29b)', () => {
  function findRoute(path: string, list: Routes = routes): Routes[number] | undefined {
    for (const route of list) {
      if (route.path === path) return route;
      if (route.children) {
        const found = findRoute(path, route.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  it('login usa el título literal de marca, sin depender de un texto "LexAr" hardcodeado', () => {
    const login = findRoute('login');
    expect(login?.title).toBe(`${environment.brandName} — Gestión legal`);
    expect(login?.data?.['titleSuffix']).toBe('literal');
  });

  it('declara solo el nombre de sección corto en las rutas principales de la app (sin sufijo de marca)', () => {
    expect(findRoute('dashboard')?.title).toBe('Tablero');
    expect(findRoute('procesos')?.title).toBe('Procesos');
    expect(findRoute('configuracion')?.title).toBe('Configuración');
  });

  it('el portal y la plataforma declaran titleSuffix en la ruta padre, no en cada hija', () => {
    const portalParent = routes.find((r) => r.path === 'portal');
    expect(portalParent?.data?.['titleSuffix']).toBe('portal');
    expect(findRoute('procesos', portalParent?.children)?.title).toBe('Mis procesos');
    // La hija no repite el sufijo — lo hereda del padre en LexArTitleStrategy.
    expect(findRoute('procesos', portalParent?.children)?.data?.['titleSuffix']).toBeUndefined();

    const adminParent = routes.find((r) => r.path === 'admin');
    expect(adminParent?.data?.['titleSuffix']).toBe('admin');
    expect(findRoute('tenants', adminParent?.children)?.title).toBe('Empresas');
  });

  it('las rutas de portal/admin declaradas a nivel raíz (login, activar-cuenta) sí llevan su propio titleSuffix', () => {
    expect(findRoute('portal/login')?.data?.['titleSuffix']).toBe('portal');
    expect(findRoute('admin/login')?.data?.['titleSuffix']).toBe('admin');
  });

  it('las rutas de redirección (index, wildcard) no declaran título propio', () => {
    const root = routes.find((r) => r.path === '' && r.redirectTo === 'login');
    expect(root?.title).toBeUndefined();
    const wildcard = routes.find((r) => r.path === '**');
    expect(wildcard?.title).toBeUndefined();
  });

  describe('mecanismo de resolución end-to-end (RouterTestingHarness + LexArTitleStrategy real)', () => {
    @Component({ selector: 'app-test-a', template: '' })
    class TestAComponent {}

    @Component({ selector: 'app-test-b', template: '' })
    class TestBComponent {}

    @Component({ selector: 'app-test-portal-parent', template: '<router-outlet />' })
    class TestPortalParentComponent {}

    const testRoutes: Routes = [
      { path: 'con-titulo', component: TestAComponent, title: 'Sección de prueba' },
      { path: 'sin-titulo', component: TestBComponent },
      {
        path: 'portal-test',
        component: TestPortalParentComponent,
        data: { titleSuffix: 'portal' },
        children: [{ path: 'hija', component: TestAComponent, title: 'Hija de prueba' }],
      },
    ];

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideRouter(testRoutes), { provide: TitleStrategy, useClass: LexArTitleStrategy }],
      });
    });

    it('setea document.title con "Sección · <marca>" al navegar a una ruta con `title`', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/con-titulo');

      expect(TestBed.inject(Title).getTitle()).toBe(`Sección de prueba · ${environment.brandName}`);
    });

    it('hereda el titleSuffix del padre para una ruta hija (portal)', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/portal-test/hija');

      expect(TestBed.inject(Title).getTitle()).toBe(`Hija de prueba · Portal ${environment.brandName}`);
    });

    it('no rompe la navegación si la ruta no declara `title` (fallback: conserva el anterior)', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/con-titulo');
      expect(TestBed.inject(Title).getTitle()).toBe(`Sección de prueba · ${environment.brandName}`);

      await harness.navigateByUrl('/sin-titulo');

      // Ni DefaultTitleStrategy ni LexArTitleStrategy borran el título si la
      // ruta no define uno — el criterio de aceptación de F29 "agregar una
      // ruta nueva sin título no rompe la app" depende de este comportamiento.
      expect(TestBed.inject(Title).getTitle()).toBe(`Sección de prueba · ${environment.brandName}`);
    });
  });
});
