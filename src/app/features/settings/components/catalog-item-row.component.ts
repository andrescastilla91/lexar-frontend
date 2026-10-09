import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { getCatalogBadgeClasses } from '../../../core/utils/catalog-badge.util';

/**
 * Fila de un ítem de catálogo (F25), extraída del contenedor en F47 para que
 * éste no crezca con cada catálogo nuevo. Se monta sobre un `<div>` (selector
 * de atributo) para que siga siendo hijo directo de `.divide-y`.
 */
@Component({
  selector: 'div[app-catalog-item-row]',
  standalone: true,
  imports: [HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-3 px-4 py-3 @lg:grid @lg:grid-cols-[auto_minmax(0,1fr)_auto] @lg:items-center @lg:gap-4 @lg:px-6',
  },
  template: `
    <div class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 @lg:contents">
      <div class="flex gap-1 @lg:flex-col">
        <button
          *hasPermission="'catalogs.manage'"
          type="button"
          class="rounded p-0.5 text-subtle hover:bg-surface-muted hover:text-text disabled:opacity-30"
          [disabled]="isFirst()"
          (click)="move.emit(-1)"
          title="Subir"
          aria-label="Subir"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <button
          *hasPermission="'catalogs.manage'"
          type="button"
          class="rounded p-0.5 text-subtle hover:bg-surface-muted hover:text-text disabled:opacity-30"
          [disabled]="isLast()"
          (click)="move.emit(1)"
          title="Bajar"
          aria-label="Bajar"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold" [class]="badgeClasses(item().color)">
            {{ item().label }}
          </span>
          <span class="font-mono text-xs text-subtle">{{ item().code }}</span>
          @if (item().isSystem) {
            <span class="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtle">
              Sistema
            </span>
          }
          @if (!item().isActive) {
            <span class="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtle">
              Inactivo
            </span>
          }
        </div>
        @if (item().usageCount) {
          <p class="mt-1 text-xs text-subtle">Usado en {{ item().usageCount }} registro(s)</p>
        }
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 border-t border-default pt-3 @lg:flex @lg:justify-end @lg:border-0 @lg:pt-0">
      <button
        *hasPermission="'catalogs.manage'"
        type="button"
        (click)="edit.emit()"
        class="rounded-md border border-default px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted"
      >
        Editar
      </button>
      <button
        *hasPermission="'catalogs.manage'"
        type="button"
        (click)="toggle.emit()"
        class="rounded-md border px-3 py-1.5 text-xs font-medium transition"
        [class]="item().isActive ? 'border-warning text-warning hover:bg-warning-tint' : 'border-success text-success hover:bg-success-tint'"
      >
        {{ item().isActive ? 'Desactivar' : 'Activar' }}
      </button>
      @if (!item().isSystem) {
        <button
          *hasPermission="'catalogs.manage'"
          type="button"
          (click)="remove.emit()"
          class="rounded-md border border-danger px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger-tint"
          [disabled]="!!item().usageCount"
          [title]="item().usageCount ? 'No se puede eliminar: está en uso' : 'Eliminar'"
        >
          Eliminar
        </button>
      }
    </div>
  `,
})
export class CatalogItemRowComponent {
  readonly item = input.required<CatalogItem>();
  readonly isFirst = input(false);
  readonly isLast = input(false);

  readonly move = output<-1 | 1>();
  readonly edit = output<void>();
  readonly toggle = output<void>();
  readonly remove = output<void>();

  protected readonly badgeClasses = getCatalogBadgeClasses;
}
