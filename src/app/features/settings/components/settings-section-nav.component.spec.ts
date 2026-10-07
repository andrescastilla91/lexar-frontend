import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SettingsSectionNavComponent, SettingsSectionNavItem } from './settings-section-nav.component';

const ITEMS: SettingsSectionNavItem[] = [
  { id: 'legal', label: 'Datos legales' },
  { id: 'billing', label: 'Facturación' },
  { id: 'catalogs', label: 'Catálogos' },
];

@Component({
  standalone: true,
  imports: [SettingsSectionNavComponent],
  template: `<app-settings-section-nav [items]="items" [activeId]="active()" (selected)="picked.push($event)" />`,
})
class HostComponent {
  readonly items = ITEMS;
  readonly active = signal('legal');
  readonly picked: string[] = [];
}

describe('SettingsSectionNavComponent', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, host: fixture.componentInstance };
  }

  const toggle = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('button[aria-controls="settings-section-panel"]')!;
  const panel = (root: HTMLElement) => root.querySelector<HTMLElement>('#settings-section-panel')!;
  const entry = (root: HTMLElement, id: string) => root.querySelector<HTMLButtonElement>(`button[data-section-id="${id}"]`)!;

  it('lista todas las secciones dentro de un nav con nombre accesible', () => {
    const { root } = create();

    expect(panel(root).tagName).toBe('NAV');
    expect(panel(root).getAttribute('aria-label')).toBe('Secciones de configuración');
    expect(root.querySelectorAll('button[data-section-id]')).toHaveLength(ITEMS.length);
  });

  it('desde lg la lista siempre se ve y el botón desplegable se oculta', () => {
    const { root } = create();

    expect(panel(root).className).toContain('lg:block');
    expect(toggle(root).className).toContain('lg:hidden');
  });

  it('el botón muestra la sección activa y arranca cerrado', () => {
    const { fixture, root, host } = create();

    expect(toggle(root).textContent).toContain('Sección:');
    expect(toggle(root).textContent).toContain('Datos legales');
    expect(toggle(root).getAttribute('aria-expanded')).toBe('false');
    expect(panel(root).classList.contains('hidden')).toBe(true);

    host.active.set('billing');
    fixture.detectChanges();
    expect(toggle(root).textContent).toContain('Facturación');
  });

  it('la sección activa se marca con aria-current y no solo con color', () => {
    const { root } = create();

    expect(entry(root, 'legal').getAttribute('aria-current')).toBe('page');
    expect(entry(root, 'billing').hasAttribute('aria-current')).toBe(false);
  });

  it('el botón abre y cierra el panel y refleja aria-expanded', () => {
    const { fixture, root } = create();

    toggle(root).click();
    fixture.detectChanges();
    expect(toggle(root).getAttribute('aria-expanded')).toBe('true');
    expect(panel(root).classList.contains('hidden')).toBe(false);

    toggle(root).click();
    fixture.detectChanges();
    expect(panel(root).classList.contains('hidden')).toBe(true);
  });

  it('elegir una sección emite su id y cierra el panel', () => {
    const { fixture, root, host } = create();
    toggle(root).click();
    fixture.detectChanges();

    entry(root, 'catalogs').click();
    fixture.detectChanges();

    expect(host.picked).toEqual(['catalogs']);
    expect(panel(root).classList.contains('hidden')).toBe(true);
  });

  it('Escape cierra el panel y devuelve el foco al botón', () => {
    const { fixture, root } = create();
    document.body.appendChild(root);
    toggle(root).click();
    fixture.detectChanges();

    panel(root).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(panel(root).classList.contains('hidden')).toBe(true);
    expect(document.activeElement).toBe(toggle(root));
    root.remove();
  });

  it('los blancos de toque miden al menos 44 px en móvil', () => {
    const { root } = create();

    expect(toggle(root).className).toContain('min-h-11');
    expect(entry(root, 'billing').className).toContain('min-h-11');
  });
});
