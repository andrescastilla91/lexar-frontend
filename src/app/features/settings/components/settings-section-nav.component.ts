import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

export interface SettingsSectionNavItem {
  id: string;
  label: string;
}

/**
 * Navegación entre las secciones de Configuración. Presentacional: recibe las
 * secciones y emite `selected`; el contenedor decide qué hacer (URL, estado).
 *
 * Hay UNA sola lista en el DOM: desde `lg` es un menú lateral siempre visible;
 * por debajo queda detrás de un botón que muestra la sección actual (mismo
 * patrón que `app-catalog-nav`), con blancos de toque de 44 px.
 */
@Component({
  selector: 'app-settings-section-nav',
  standalone: true,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #toggle
      type="button"
      class="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-default bg-surface px-4 py-2 text-left text-sm font-medium text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 lg:hidden"
      [attr.aria-expanded]="open()"
      aria-controls="settings-section-panel"
      (click)="open.set(!open())"
    >
      <span class="min-w-0 truncate">
        <span class="text-subtle">Sección:</span>
        {{ activeLabel() }}
      </span>
      <svg
        class="h-4 w-4 flex-shrink-0 motion-safe:transition-transform"
        [class.rotate-180]="open()"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <nav
      id="settings-section-panel"
      aria-label="Secciones de configuración"
      class="mt-2 max-h-[60vh] space-y-0.5 overflow-y-auto rounded-lg border border-default bg-surface p-2 shadow-card lg:mt-0 lg:block lg:max-h-none lg:space-y-1 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
      [class.hidden]="!open()"
      (keydown.escape)="close(true)"
    >
      @for (item of items(); track item.id) {
        <button
          type="button"
          class="flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium motion-safe:transition lg:min-h-0"
          [class.bg-navy-900]="item.id === activeId()"
          [class.text-white]="item.id === activeId()"
          [class.text-subtle]="item.id !== activeId()"
          [class.hover:bg-surface-muted]="item.id !== activeId()"
          [attr.aria-current]="item.id === activeId() ? 'page' : null"
          [attr.data-section-id]="item.id"
          (click)="choose(item.id)"
        >
          {{ item.label }}
        </button>
      }
    </nav>
  `,
})
export class SettingsSectionNavComponent {
  readonly items = input.required<SettingsSectionNavItem[]>();
  readonly activeId = input.required<string>();
  readonly selected = output<string>();

  readonly open = signal(false);
  readonly activeLabel = computed(() => this.items().find((item) => item.id === this.activeId())?.label ?? '');

  private readonly toggle = viewChild<ElementRef<HTMLButtonElement>>('toggle');

  choose(id: string): void {
    this.open.set(false);
    this.selected.emit(id);
  }

  close(restoreFocus = false): void {
    this.open.set(false);
    if (restoreFocus) {
      this.toggle()?.nativeElement.focus();
    }
  }
}
