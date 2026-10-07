import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MENU_ITEMS, MenuGroup, groupMenuItems } from './menu-items';
import { SidebarComponent } from './sidebar.component';

@Component({
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <aside
      app-sidebar
      [groups]="groups()"
      [open]="open()"
      [collapsed]="collapsed()"
      [companyName]="companyName()"
      [companyLogoUrl]="logoUrl()"
      (toggleCollapsed)="toggled = toggled + 1"
      (closeRequested)="closed = closed + 1"
    ></aside>
  `,
})
class HostComponent {
  readonly groups = signal<MenuGroup[]>(groupMenuItems(MENU_ITEMS));
  readonly open = signal(false);
  readonly collapsed = signal(false);
  readonly companyName = signal('Bufete Pérez');
  readonly logoUrl = signal<string | null>(null);
  toggled = 0;
  closed = 0;
}

describe('SidebarComponent (F48)', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, host: fixture.componentInstance };
  }

  const links = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLAnchorElement>('nav a[data-menu-route]'));
  const link = (root: HTMLElement, route: string) =>
    root.querySelector<HTMLAnchorElement>(`nav a[data-menu-route="${route}"]`)!;

  it('muestra los encabezados de grupo y no pone encabezado al Dashboard', () => {
    const { root } = create();

    const headings = Array.from(root.querySelectorAll('nav p')).map((p) => p.textContent?.trim());
    expect(headings).toEqual(['Trabajo', 'Asistencia', 'Administración']);
  });

  it('cada grupo es una lista con su encabezado como nombre accesible', () => {
    const { root } = create();

    const lists = Array.from(root.querySelectorAll('nav ul'));
    expect(lists).toHaveLength(4);
    expect(lists[0].hasAttribute('aria-labelledby')).toBe(false);
    expect(root.querySelector(`#${lists[1].getAttribute('aria-labelledby')}`)?.textContent?.trim()).toBe('Trabajo');
  });

  it('la fila es de una sola línea: la descripción no se pinta como texto visible', () => {
    const { root } = create();

    const description = root.querySelector('#menu-desc-clientes');
    expect(description?.className).toContain('sr-only');
    expect(description?.textContent).toContain('Portafolio y riesgos asociados');
    expect(link(root, '/clientes').textContent).not.toContain('Portafolio');
    expect(link(root, '/clientes').getAttribute('title')).toBe('Portafolio y riesgos asociados');
  });

  it('la descripción es el texto accesible del ítem (aria-describedby)', () => {
    const { root } = create();

    const anchor = link(root, '/tareas');
    const describedBy = anchor.getAttribute('aria-describedby')!;
    expect(root.querySelector(`#${describedBy}`)?.textContent).toContain('Trabajo asignado');
  });

  it('el ítem de la ruta activa lleva aria-current y el indicador de marca', async () => {
    const { fixture, root } = create();
    const router = TestBed.inject(Router);
    router.resetConfig([{ path: 'clientes', children: [] }, { path: '**', children: [] }]);
    await router.navigateByUrl('/clientes');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const active = link(root, '/clientes');
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(active.className).toContain('border-bronze-500');
    expect(active.className).toContain('font-semibold');
    expect(link(root, '/tareas').hasAttribute('aria-current')).toBe(false);
    expect(link(root, '/tareas').className).toContain('border-transparent');
  });

  it('clic en un ítem pide cerrar el cajón móvil', () => {
    const { fixture, root, host } = create();

    link(root, '/clientes').click();
    fixture.detectChanges();

    expect(host.closed).toBe(1);
  });

  it('el cajón móvil se oculta con -translate-x-full cuando no está abierto', () => {
    const { fixture, root, host } = create();
    const aside = root.querySelector('aside')!;

    expect(aside.className).toContain('-translate-x-full');
    host.open.set(true);
    fixture.detectChanges();
    expect(aside.className).not.toContain('-translate-x-full');
  });

  it('el aside conserva su ancho fijo (shrink-0) y tiene nombre accesible', () => {
    const { root } = create();
    const aside = root.querySelector('aside')!;

    expect(aside.className).toContain('shrink-0');
    expect(aside.getAttribute('aria-label')).toBe('Navegación principal');
  });

  describe('expandido', () => {
    it('ofrece contraer el menú y no el de expandir', () => {
      const { root } = create();

      const button = root.querySelector<HTMLButtonElement>('button[aria-label="Contraer menú"]');
      expect(button?.getAttribute('aria-expanded')).toBe('true');
      expect(root.querySelector('button[aria-label="Expandir menú"]')).toBeNull();
      expect(root.querySelector('aside')?.className).toContain('lg:w-72');
    });

    it('contraer emite toggleCollapsed', () => {
      const { fixture, root, host } = create();

      root.querySelector<HTMLButtonElement>('button[aria-label="Contraer menú"]')!.click();
      fixture.detectChanges();

      expect(host.toggled).toBe(1);
    });

    it('no pinta tooltips (usa title)', () => {
      const { root } = create();

      expect(root.querySelector('[data-menu-tooltip]')).toBeNull();
    });
  });

  describe('colapsado (rail)', () => {
    function createCollapsed() {
      const ctx = create();
      ctx.host.collapsed.set(true);
      ctx.fixture.detectChanges();
      return ctx;
    }

    it('reduce el ancho a 64 px desde lg', () => {
      const { root } = createCollapsed();
      const aside = root.querySelector('aside')!;

      expect(aside.className).toContain('lg:w-16');
      expect(aside.className).not.toContain('lg:w-72');
    });

    it('oculta los encabezados de grupo y los reemplaza por un separador', () => {
      const { root } = createCollapsed();

      const headings = Array.from(root.querySelectorAll<HTMLElement>('nav p'));
      for (const heading of headings) {
        expect(heading.className).toContain('lg:hidden');
      }
      expect(root.querySelectorAll('nav hr')).toHaveLength(3);
    });

    it('la etiqueta sigue en el árbol de accesibilidad (sr-only) y el ítem conserva su nombre', () => {
      const { root } = createCollapsed();

      const label = link(root, '/clientes').querySelector('span.truncate')!;
      expect(label.className).toContain('lg:sr-only');
      expect(label.textContent?.trim()).toBe('Clientes');
    });

    it('cada ítem tiene un tooltip con etiqueta y descripción, visible al enfocar con teclado', () => {
      const { root } = createCollapsed();

      const tooltip = link(root, '/clientes').querySelector('[data-menu-tooltip]')!;
      expect(tooltip.getAttribute('aria-hidden')).toBe('true');
      expect(tooltip.textContent).toContain('Clientes');
      expect(tooltip.textContent).toContain('Portafolio y riesgos asociados');
      expect(tooltip.className).toContain('lg:group-hover:block');
      expect(tooltip.className).toContain('lg:group-focus-visible:block');
      expect(link(root, '/clientes').hasAttribute('title')).toBe(false);
    });

    it('ofrece expandir el menú y emite toggleCollapsed', () => {
      const { fixture, root, host } = createCollapsed();

      expect(root.querySelector('button[aria-label="Contraer menú"]')).toBeNull();
      const button = root.querySelector<HTMLButtonElement>('button[aria-label="Expandir menú"]')!;
      expect(button.getAttribute('aria-expanded')).toBe('false');
      button.click();
      fixture.detectChanges();

      expect(host.toggled).toBe(1);
    });

    it('el navegador no recorta los tooltips (sin overflow-y-auto en el rail)', () => {
      const { root } = createCollapsed();

      expect(root.querySelector('nav')?.className).not.toContain(' overflow-y-auto');
      expect(root.querySelector('nav')?.className).toContain('lg:overflow-visible');
    });
  });

  describe('cabecera', () => {
    it('sin logo muestra la inicial de la empresa y el nombre con «LexAr Suite»', () => {
      const { root } = create();

      expect(root.querySelector('img')).toBeNull();
      expect(root.textContent).toContain('Bufete Pérez');
      expect(root.textContent).toContain('LexAr Suite');
      expect(root.querySelector('aside > div span[aria-hidden="true"]')?.textContent?.trim()).toBe('B');
    });

    it('con logo lo muestra decorativo (alt vacío)', () => {
      const { fixture, root, host } = create();

      host.logoUrl.set('https://cdn.test/logo.png');
      fixture.detectChanges();

      const img = root.querySelector('img')!;
      expect(img.getAttribute('src')).toBe('https://cdn.test/logo.png');
      expect(img.getAttribute('alt')).toBe('');
    });

    it('sin nombre de empresa cae a «Gestión Legal» y a la inicial «L»', () => {
      const { fixture, root, host } = create();

      host.companyName.set('');
      fixture.detectChanges();

      expect(root.textContent).toContain('Gestión Legal');
      expect(root.querySelector('aside > div span[aria-hidden="true"]')?.textContent?.trim()).toBe('L');
    });
  });

  it('con todos los grupos vacíos no pinta navegación', () => {
    const { fixture, root, host } = create();

    host.groups.set([]);
    fixture.detectChanges();

    expect(links(root)).toHaveLength(0);
    expect(root.querySelectorAll('nav p')).toHaveLength(0);
  });
});
