import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuGroup } from './menu-items';

/**
 * F48 — menú lateral. Presentacional: recibe los grupos ya filtrados por
 * permisos y emite eventos; no conoce rutas ni usuarios.
 *
 * `collapsed` solo aplica desde `lg` (rail de iconos); en móvil el menú es un
 * cajón con etiquetas completas. La descripción de cada ítem ya no ocupa una
 * segunda línea: es `title` (ratón), texto accesible (`aria-describedby`) y, en
 * el rail, un tooltip visual (aria-hidden) que también aparece al enfocar con teclado.
 */
@Component({
  selector: 'aside[app-sidebar]',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col bg-navy-900 text-white shadow-raised motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out lg:static lg:translate-x-0',
    '[class.-translate-x-full]': '!open()',
    '[class.lg:w-16]': 'collapsed()',
    '[class.lg:w-72]': '!collapsed()',
    'aria-label': 'Navegación principal',
  },
  template: `
    <div class="flex h-16 shrink-0 items-center gap-3 px-4" [class.lg:justify-center]="collapsed()" [class.lg:px-2]="collapsed()">
      @if (companyLogoUrl()) {
        <img [src]="companyLogoUrl()" alt="" class="h-9 w-9 shrink-0 rounded-md bg-white/10 object-contain" />
      } @else {
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {{ monogram() }}
        </span>
      }
      <div class="min-w-0 flex-1" [class.lg:hidden]="collapsed()">
        <p class="truncate text-sm font-semibold leading-tight">{{ companyName() || 'Gestión Legal' }}</p>
        <p class="text-[11px] uppercase tracking-widest text-navy-300">LexAr Suite</p>
      </div>
      @if (!collapsed()) {
        <button
          type="button"
          class="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-navy-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-300 motion-safe:transition lg:flex"
          aria-label="Contraer menú"
          [attr.aria-expanded]="true"
          (click)="toggleCollapsed.emit()"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5" />
          </svg>
        </button>
      }
      <button
        type="button"
        class="rounded-md p-2 text-white/70 hover:bg-white/10 lg:hidden"
        aria-label="Cerrar menú"
        (click)="closeRequested.emit()"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    @if (collapsed()) {
      <button
        type="button"
        class="mx-2 mb-1 hidden h-9 items-center justify-center rounded-md text-navy-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-300 motion-safe:transition lg:flex"
        aria-label="Expandir menú"
        [attr.aria-expanded]="false"
        (click)="toggleCollapsed.emit()"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    }

    <nav class="min-h-0 flex-1 px-3 pb-4" [class.overflow-y-auto]="!collapsed()" [class.lg:overflow-visible]="collapsed()" aria-label="Secciones">
      @for (group of groups(); track group.id; let first = $first) {
        <div [class.mt-4]="!first" [class.lg:mt-2]="collapsed() && !first">
          @if (group.label) {
            <p
              class="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-navy-300"
              [class.lg:hidden]="collapsed()"
              [id]="'menu-group-' + group.id"
            >
              {{ group.label }}
            </p>
            @if (collapsed()) {
              <hr class="mx-2 mb-2 hidden border-white/10 lg:block" />
            }
          }
          <ul class="space-y-0.5" [attr.aria-labelledby]="group.label ? 'menu-group-' + group.id : null">
            @for (item of group.items; track item.route) {
              <li>
                <a
                  #rla="routerLinkActive"
                  [routerLink]="item.route"
                  routerLinkActive
                  ariaCurrentWhenActive="page"
                  class="group relative flex min-h-11 items-center gap-3 rounded-md border-l-[3px] px-3 text-sm hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-300 motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out lg:min-h-9"
                  [class.border-bronze-500]="rla.isActive"
                  [class.bg-navy-800]="rla.isActive"
                  [class.font-semibold]="rla.isActive"
                  [class.text-white]="rla.isActive"
                  [class.border-transparent]="!rla.isActive"
                  [class.font-medium]="!rla.isActive"
                  [class.text-navy-300]="!rla.isActive"
                  [class.lg:justify-center]="collapsed()"
                  [class.lg:px-0]="collapsed()"
                  [attr.title]="collapsed() ? null : item.description"
                  [attr.aria-describedby]="'menu-desc-' + item.route.slice(1)"
                  [attr.data-menu-route]="item.route"
                  (click)="closeRequested.emit()"
                >
                  <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path [attr.d]="item.icon" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                  <span class="truncate" [class.lg:sr-only]="collapsed()">{{ item.label }}</span>
                  @if (collapsed()) {
                    <span
                      aria-hidden="true"
                      data-menu-tooltip
                      class="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-navy-950 px-2.5 py-1.5 text-xs text-white shadow-raised lg:group-hover:block lg:group-focus-visible:block"
                    >
                      <span class="font-semibold">{{ item.label }}</span>
                      <span class="block text-navy-300">{{ item.description }}</span>
                    </span>
                  }
                </a>
                <span class="sr-only" [id]="'menu-desc-' + item.route.slice(1)">{{ item.description }}</span>
              </li>
            }
          </ul>
        </div>
      }
    </nav>
  `,
})
export class SidebarComponent {
  readonly groups = input.required<MenuGroup[]>();
  readonly open = input(false);
  readonly collapsed = input(false);
  readonly companyName = input('');
  readonly companyLogoUrl = input<string | null>(null);

  readonly toggleCollapsed = output<void>();
  readonly closeRequested = output<void>();

  readonly monogram = computed(() => (this.companyName().trim().charAt(0) || 'L').toUpperCase());
}
