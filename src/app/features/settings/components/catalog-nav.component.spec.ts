import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CatalogSummaryItem, CatalogType } from '../../../core/models/catalog-backend.model';
import { CATALOG_META } from '../utils/catalog-registry';
import { CatalogNavComponent } from './catalog-nav.component';

@Component({
  standalone: true,
  imports: [CatalogNavComponent],
  template: `<app-catalog-nav [activeType]="active()" [summary]="summary()" (selected)="picked.push($event)" />`,
})
class HostComponent {
  readonly active = signal<CatalogType>('process_type');
  readonly summary = signal<CatalogSummaryItem[] | null>([
    { catalogType: 'process_type', total: 4, active: 3 },
    { catalogType: 'document_type', total: 6, active: 6 },
  ]);
  readonly picked: CatalogType[] = [];
}

describe('CatalogNavComponent (F47)', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, host: fixture.componentInstance };
  }

  const entry = (root: HTMLElement, type: string) =>
    root.querySelector<HTMLButtonElement>(`button[data-catalog-type="${type}"]`);

  it('muestra todos los catálogos agrupados por dominio', () => {
    const { root } = create();

    const groups = Array.from(root.querySelectorAll('nav p')).map((p) => p.textContent?.trim());
    expect(groups).toEqual(['Clientes', 'Procesos', 'Agenda', 'Documentos', 'Equipo']);
    expect(root.querySelectorAll('button[data-catalog-type]')).toHaveLength(Object.keys(CATALOG_META).length);
  });

  it('muestra el contador de ítems activos de cada catálogo y lo anuncia en su nombre accesible', () => {
    const { root } = create();

    expect(entry(root, 'process_type')?.getAttribute('aria-label')).toBe('Tipos de proceso, 3 ítems activos');
    expect(entry(root, 'process_type')?.textContent).toContain('3');
    expect(entry(root, 'document_type')?.textContent).toContain('6');
    expect(entry(root, 'contingency')?.textContent).toContain('0');
  });

  it('sin resumen no muestra contadores', () => {
    const { fixture, root, host } = create();

    host.summary.set(null);
    fixture.detectChanges();

    expect(entry(root, 'process_type')?.getAttribute('aria-label')).toBe('Tipos de proceso');
    expect(entry(root, 'process_type')?.textContent).not.toMatch(/\d/);
  });

  it('el catálogo activo se marca con aria-current y no solo con color', () => {
    const { root } = create();

    expect(entry(root, 'process_type')?.getAttribute('aria-current')).toBe('true');
    expect(entry(root, 'process_type')?.className).toContain('font-semibold');
    expect(entry(root, 'document_type')?.getAttribute('aria-current')).toBeNull();
  });

  it('elegir un catálogo emite su tipo', () => {
    const { fixture, root, host } = create();

    entry(root, 'risk_level')?.click();
    fixture.detectChanges();

    expect(host.picked).toEqual(['risk_level']);
  });

  it('el buscador filtra por nombre y avisa si no hay coincidencias', () => {
    const { fixture, root } = create();
    const input = root.querySelector<HTMLInputElement>('input[type="search"]') as HTMLInputElement;

    input.value = 'contingencia';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.querySelectorAll('button[data-catalog-type]')).toHaveLength(1);

    input.value = 'zzzz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.querySelectorAll('button[data-catalog-type]')).toHaveLength(0);
    expect(root.querySelector('[role="status"]')?.textContent).toContain('zzzz');
  });

  it('el buscador tiene etiqueta accesible', () => {
    const { root } = create();

    expect(root.querySelector('label .sr-only')?.textContent).toContain('Buscar catálogo');
  });

  describe('móvil', () => {
    const toggle = (root: HTMLElement) => root.querySelector<HTMLButtonElement>('button[aria-controls]') as HTMLButtonElement;
    const panel = (root: HTMLElement) => root.querySelector('#catalog-nav-panel') as HTMLElement;

    it('el botón muestra el catálogo actual y el panel arranca cerrado', () => {
      const { root } = create();

      expect(toggle(root).textContent).toContain('Tipos de proceso');
      expect(toggle(root).getAttribute('aria-expanded')).toBe('false');
      expect(panel(root).classList.contains('hidden')).toBe(true);
    });

    it('abre y cierra el panel, y elegir un catálogo lo cierra', () => {
      const { fixture, root } = create();

      toggle(root).click();
      fixture.detectChanges();
      expect(toggle(root).getAttribute('aria-expanded')).toBe('true');
      expect(panel(root).classList.contains('hidden')).toBe(false);

      entry(root, 'laft_risk')?.click();
      fixture.detectChanges();
      expect(panel(root).classList.contains('hidden')).toBe(true);
    });

    it('Escape cierra el panel', () => {
      const { fixture, root } = create();
      toggle(root).click();
      fixture.detectChanges();

      panel(root).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(panel(root).classList.contains('hidden')).toBe(true);
    });

    it('los blancos de toque miden al menos 44 px en contenedores angostos', () => {
      const { root } = create();

      expect(toggle(root).className).toContain('min-h-11');
      expect(entry(root, 'document_type')?.className).toContain('min-h-11');
      expect(root.querySelector('input[type="search"]')?.className).toContain('min-h-11');
    });
  });
});
