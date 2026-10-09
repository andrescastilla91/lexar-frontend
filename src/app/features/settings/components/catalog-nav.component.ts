import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CatalogSummaryItem, CatalogType } from '../../../core/models/catalog-backend.model';
import { CATALOG_META, buildCatalogNav } from '../utils/catalog-registry';

/**
 * F47 — navegación entre catálogos: lista vertical agrupada por dominio, con
 * buscador y contador de ítems activos. Reemplaza las pestañas horizontales.
 *
 * Es presentacional: no carga datos ni toca la URL; el contenedor le pasa el
 * resumen y escucha `selected`. Hay UNA sola lista en el DOM. El corte usa
 * container queries (`@min-[44rem]`) sobre el `@container` de `app-settings-catalogs`,
 * no el ancho del viewport: el espacio real depende del sidebar de la app y del
 * menú de Configuración. Con el contenedor ancho la lista se ve siempre; si no,
 * queda detrás de un botón que muestra el catálogo actual (sin scroll
 * horizontal y con blancos de toque de 44 px).
 */
@Component({
  selector: 'app-catalog-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-default bg-surface px-4 py-2 text-left text-sm font-medium text-text shadow-card @min-[44rem]:hidden"
      [attr.aria-expanded]="mobileOpen()"
      aria-controls="catalog-nav-panel"
      (click)="mobileOpen.set(!mobileOpen())"
    >
      <span class="min-w-0 truncate">
        <span class="text-subtle">Catálogo:</span>
        {{ activeLabel() }}
      </span>
      <svg
        class="h-4 w-4 flex-shrink-0 motion-safe:transition-transform"
        [class.rotate-180]="mobileOpen()"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div
      id="catalog-nav-panel"
      class="mt-2 space-y-3 rounded-lg border border-default bg-surface p-3 shadow-card @min-[44rem]:mt-0 @min-[44rem]:block @min-[44rem]:max-h-[calc(100vh-10rem)] @min-[44rem]:overflow-y-auto"
      [class.hidden]="!mobileOpen()"
      (keydown.escape)="mobileOpen.set(false)"
    >
      <label class="block">
        <span class="sr-only">Buscar catálogo</span>
        <input
          type="search"
          autocomplete="off"
          placeholder="Buscar catálogo…"
          class="min-h-11 w-full rounded-md border border-default bg-surface px-3 py-2 text-sm text-text focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 @min-[44rem]:min-h-10"
          [value]="query()"
          (input)="onSearch($event)"
        />
      </label>

      <nav aria-label="Catálogos disponibles" class="space-y-4">
        @for (group of groups(); track group.id) {
          <div>
            <p class="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-subtle">{{ group.label }}</p>
            <ul class="space-y-0.5">
              @for (entry of group.entries; track entry.type) {
                <li>
                  <button
                    type="button"
                    class="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border-l-2 px-2 py-2 text-left text-sm motion-safe:transition @min-[44rem]:min-h-9"
                    [class.border-navy-900]="entry.type === activeType()"
                    [class.bg-surface-muted]="entry.type === activeType()"
                    [class.font-semibold]="entry.type === activeType()"
                    [class.text-text]="entry.type === activeType()"
                    [class.border-transparent]="entry.type !== activeType()"
                    [class.text-muted]="entry.type !== activeType()"
                    [class.hover:bg-surface-muted]="entry.type !== activeType()"
                    [attr.aria-current]="entry.type === activeType() ? 'true' : null"
                    [attr.aria-label]="entry.activeCount === null ? entry.label : entry.label + ', ' + entry.activeCount + ' ítems activos'"
                    [attr.data-catalog-type]="entry.type"
                    (click)="choose(entry.type)"
                  >
                    <span class="min-w-0">{{ entry.label }}</span>
                    @if (entry.activeCount !== null) {
                      <span class="flex-shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-subtle">
                        {{ entry.activeCount }}
                      </span>
                    }
                  </button>
                </li>
              }
            </ul>
          </div>
        } @empty {
          <p class="px-2 py-4 text-sm text-subtle" role="status">Ningún catálogo coincide con «{{ query() }}».</p>
        }
      </nav>
    </div>
  `,
})
export class CatalogNavComponent {
  readonly activeType = input.required<CatalogType>();
  /** `null` mientras carga o si falló: los contadores simplemente no se muestran. */
  readonly summary = input<CatalogSummaryItem[] | null>(null);
  readonly selected = output<CatalogType>();

  readonly query = signal('');
  readonly mobileOpen = signal(false);

  readonly groups = computed(() => buildCatalogNav(this.summary(), this.query()));
  readonly activeLabel = computed(() => CATALOG_META[this.activeType()].label);

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  choose(type: CatalogType): void {
    this.mobileOpen.set(false);
    this.selected.emit(type);
  }
}
