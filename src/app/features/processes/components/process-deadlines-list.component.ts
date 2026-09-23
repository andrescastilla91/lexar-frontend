import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DeadlineResponse, DeadlineStatus } from '../../../core/models/deadline.model';
import { formatDate } from '../utils/process-format.utils';
import { getCatalogBadgeClasses } from '../../../core/utils/catalog-badge.util';
import { getDeadlineStatusClasses, getDeadlineStatusLabel } from '../../../core/utils/deadline-format.util';

/**
 * F41 (ola 4, rediseño 2026-09-23): antes `ProcessDeadlinesModalComponent`
 * — tenía el listado Y el formulario de alta/edición embebido (con su
 * propio ngx-editor). El formulario se reemplazó por
 * DeadlineFormModalComponent (alta, compartido con Calendario) y
 * DeadlineDetailComponent (edición, /calendario/plazos/:id) — este
 * componente queda solo como lo que su nombre ahora dice: el listado de
 * plazos de la pestaña "Plazos" de un proceso.
 */
@Component({
  selector: 'app-process-deadlines-list',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col rounded-lg border border-default bg-surface shadow-card overflow-hidden">
      <div class="flex items-center justify-between border-b border-default p-4">
        <h3 class="text-sm font-semibold text-text">Plazos y audiencias ({{ deadlines().length }})</h3>
        <button
          type="button"
          (click)="create.emit()"
          class="rounded-md bg-navy-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-950"
        >
          + Nuevo plazo
        </button>
      </div>
      <div class="p-4">
      @if (isLoading()) {
        <div class="flex items-center justify-center py-8">
          <div class="h-6 w-6 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (deadlines().length === 0) {
        <p class="rounded-lg border border-default bg-surface-muted p-6 text-center text-sm text-subtle">
          No hay plazos registrados para este proceso
        </p>
      } @else {
        <div class="space-y-2">
          @for (deadline of deadlines(); track deadline.id) {
            <div class="flex items-start justify-between gap-3 rounded-lg border border-default bg-surface p-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-medium text-text truncate">{{ deadline.title }}</p>
                  @if (deadline.type) {
                    <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getCatalogBadgeClasses(deadline.type.color)">
                      {{ deadline.type.label }}
                    </span>
                  }
                  <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getDeadlineStatusClasses(deadline.status)">
                    {{ getDeadlineStatusLabel(deadline.status) }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-subtle">{{ formatDate(deadline.dueAt) }}</p>
                @if (deadline.assignees.length > 0) {
                  <p class="mt-1 text-xs text-subtle">
                    Asignado a:
                    @for (assignee of deadline.assignees; track assignee.id) {
                      <span class="text-text">{{ assignee.firstName }} {{ assignee.lastName }}@if (!$last) {, }</span>
                    }
                  </p>
                }
              </div>
              <div class="flex flex-shrink-0 items-center gap-1">
                @if (canEdit()) {
                  <button
                    type="button"
                    (click)="edit.emit(deadline)"
                    class="rounded-lg p-2 text-muted transition hover:bg-surface-muted"
                    title="Editar plazo"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                }
                @if (deadline.status === DeadlineStatus.PENDING) {
                  <button
                    type="button"
                    (click)="markDone.emit(deadline)"
                    class="rounded-lg p-2 text-success transition hover:bg-success-tint"
                    title="Marcar como completado"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </button>
                }
                <button
                  type="button"
                  (click)="deleteDeadline.emit(deadline)"
                  class="rounded-lg p-2 text-danger transition hover:bg-danger-tint"
                  title="Eliminar plazo"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      }
      </div>
    </div>
  `,
})
export class ProcessDeadlinesListComponent {
  isLoading = input(false);
  deadlines = input<DeadlineResponse[]>([]);
  /** F41 (ola 4): gatea el botón "Editar" de cada fila — lo decide el
   * padre (permiso deadlines.update), este componente es puramente
   * presentacional. */
  canEdit = input(false);

  /** F41 (ola 4, rediseño 2026-09-23): el padre abre
   * DeadlineFormModalComponent — este componente ya no sabe nada de
   * formularios, solo pide que se cree uno nuevo. */
  create = output<void>();
  markDone = output<DeadlineResponse>();
  deleteDeadline = output<DeadlineResponse>();
  /** F41 (ola 4, rediseño 2026-09-23): el padre navega a
   * /calendario/plazos/:id — este componente ya no abre ningún diálogo de
   * edición propio. */
  edit = output<DeadlineResponse>();

  protected readonly DeadlineStatus = DeadlineStatus;
  protected readonly formatDate = formatDate;
  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;
  protected readonly getDeadlineStatusClasses = getDeadlineStatusClasses;
  protected readonly getDeadlineStatusLabel = getDeadlineStatusLabel;
}
