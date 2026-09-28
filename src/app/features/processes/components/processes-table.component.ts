import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalProcessResponse } from '../../../core/models/legal-process.model';
import { ClientMatterStatus } from '../../../core/models/client-backend.model';
import { formatDate, getStatusClasses, getStatusDot, getStatusLabel } from '../utils/process-format.utils';
import { getCatalogBadgeClasses } from '../../../core/utils/catalog-badge.util';
// F34-b: mismo badge de vigencia que ya usa la pestaña Asuntos del cliente.
import { matterStatusClasses, matterStatusLabel } from '../../../core/utils/matter-format.util';

/**
 * F40 Ola 4a: la tabla deja de orquestar 7 modales — el título navega a la
 * ficha de detalle (`/procesos/:id`, mismo patrón que `clients.component.ts`
 * → `ClientDetailComponent`) donde viven Datos/Contrapartes/Plazos/Tareas/
 * Anotaciones/Historial y el botón de cambio de estado. Solo "Eliminar" se
 * queda como acción rápida en la fila (destructiva, no amerita abrir el
 * detalle — ver "Ola 4 (revisada)" en F40-ajustes-procesos-piloto.md).
 *
 * BUG-24 (fix): el bloque de escritorio no tenía ninguna clase de
 * visibilidad responsive, así que en viewport mobile se renderizaba junto
 * al bloque `md:hidden` de abajo, duplicando las acciones. Ahora lleva
 * `hidden md:block`, simétrico al `md:hidden` del bloque mobile.
 */
@Component({
  selector: 'app-processes-table',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!hasFullAccess()) {
      <p class="mb-4 rounded-md border border-default bg-surface-muted px-4 py-2.5 text-sm text-subtle">
        Ves los procesos a tu cargo.
      </p>
    }

    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
      </div>
    } @else if (processes().length === 0) {
      <div class="rounded-lg border border-default bg-surface p-12 text-center">
        <p class="text-subtle">No hay procesos registrados</p>
      </div>
    } @else {
      <!-- Vista de Lista (Cards) — BUG-24: hidden md:block agregado, antes
           coexistía sin filtro con el bloque mobile de abajo. -->
      <div class="hidden md:block space-y-4">
        @for (process of processes(); track process.id) {
          <div class="rounded-lg border border-default bg-surface p-6 shadow-card hover:shadow-card transition-shadow">
            <div class="space-y-4">
              <!-- Header: Título y Acción -->
              <div class="flex items-start justify-between gap-4">
                <!-- Título y Número de Caso -->
                <div class="flex-1 min-w-0">
                  <a
                    [routerLink]="['/procesos', process.id]"
                    class="text-lg font-semibold text-text hover:text-navy-900"
                  >
                    {{ process.title }}
                  </a>
                  <p class="mt-1 font-mono text-sm text-subtle">
                    {{ process.caseNumber || 'Sin número de caso asignado' }}
                  </p>
                </div>

                <!-- Acciones -->
                <div class="flex items-center gap-2">
                  <a
                    [routerLink]="['/procesos', process.id]"
                    class="rounded-lg p-2 text-subtle transition hover:bg-surface-muted hover:text-text"
                    title="Ver detalle"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </a>

                  <button
                    type="button"
                    (click)="delete.emit(process)"
                    class="rounded-lg p-2 text-danger transition hover:bg-danger-tint"
                    title="Eliminar proceso"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Grid de Información -->
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <!-- Cliente -->
                <div>
                  <p class="text-xs font-medium text-subtle uppercase tracking-wide">Cliente</p>
                  <p class="mt-1 text-sm font-medium text-text">{{ process.client.fullName || 'Sin cliente' }}</p>
                  <!-- F34-b: asunto vinculado, visible sin abrir el proceso -->
                  @if (process.matter) {
                    <p class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                      <span>{{ process.matter.name }}</span>
                      @if (process.matter.isDeleted) {
                        <span class="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-subtle">
                          Eliminado
                        </span>
                      } @else if (process.matter.status === ClientMatterStatus.VENCIDO) {
                        <span
                          class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          [class]="matterStatusClasses(process.matter.status)"
                        >
                          {{ matterStatusLabel(process.matter.status) }}
                        </span>
                      }
                    </p>
                  } @else {
                    <p class="mt-0.5 text-xs text-subtle">Sin asunto</p>
                  }
                </div>

                <!-- Estado -->
                <div>
                  <p class="text-xs font-medium text-subtle uppercase tracking-wide">Estado</p>
                  <span class="mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                    [class]="getStatusClasses(process.status)">
                    <span class="h-2 w-2 rounded-full" [class]="getStatusDot(process.status)"></span>
                    {{ getStatusLabel(process.status) }}
                  </span>
                </div>

                <!-- Etapa -->
                <div>
                  <p class="text-xs font-medium text-subtle uppercase tracking-wide">Etapa</p>
                  <p class="mt-1 text-sm text-text">{{ process.stage?.label || 'N/A' }}</p>
                </div>

                <!-- Tipo de proceso (F40 §PRO-04) -->
                <div>
                  <p class="text-xs font-medium text-subtle uppercase tracking-wide">Tipo de proceso</p>
                  <p class="mt-1 text-sm text-text">{{ process.processType?.label || 'Sin clasificar' }}</p>
                </div>

                <!-- Riesgo -->
                <div>
                  <p class="text-xs font-medium text-subtle uppercase tracking-wide">Riesgo</p>
                  <span class="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    [class]="getCatalogBadgeClasses(process.riskLevel?.color)">
                    {{ process.riskLevel?.label || 'N/A' }}
                  </span>
                </div>
              </div>

              <!-- Asesores y Fecha -->
              <div class="flex flex-wrap items-center gap-4 text-sm">
                <!-- Asesores -->
                @if (process.advisors && process.advisors.length > 0) {
                  <div class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Zm-13.5 0a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                    <div class="flex flex-wrap gap-1">
                      @for (advisor of process.advisors; track advisor.id) {
                        <span class="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text">
                          {{ advisor.user?.firstName }} {{ advisor.user?.lastName }}
                        </span>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="flex items-center gap-2 text-subtle">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                    <span class="text-xs">Sin asesores asignados</span>
                  </div>
                }

                <!-- Fecha de actualización -->
                <div class="flex items-center gap-2 text-subtle">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span class="text-xs">Actualizado {{ formatDate(process.updatedAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Vista Mobile/Tablet: Cards -->
      <div class="grid gap-4 md:hidden">
        @for (process of processes(); track process.id) {
          <div class="rounded-lg border border-default bg-surface p-4 shadow-card">
            <div class="space-y-3">
              <!-- Título y número de caso -->
              <div>
                <a
                  [routerLink]="['/procesos', process.id]"
                  class="font-semibold text-text hover:text-navy-900"
                >
                  {{ process.title }}
                </a>
                @if (process.caseNumber) {
                  <p class="mt-1 font-mono text-xs text-subtle">{{ process.caseNumber }}</p>
                }
              </div>

              <!-- Info grid -->
              <div class="grid gap-2 text-sm">
                <div class="flex items-start justify-between gap-2">
                  <span class="text-xs font-medium text-subtle">Cliente:</span>
                  <span class="text-xs text-text">{{ process.client.fullName || 'Sin cliente' }}</span>
                </div>

                <div class="flex items-start justify-between gap-2">
                  <span class="text-xs font-medium text-subtle">Estado:</span>
                  <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                    [class]="getStatusClasses(process.status)">
                    <span class="h-2 w-2 rounded-full" [class]="getStatusDot(process.status)"></span>
                    {{ getStatusLabel(process.status) }}
                  </span>
                </div>

                <div class="flex items-start justify-between gap-2">
                  <span class="text-xs font-medium text-subtle">Etapa:</span>
                  <span class="text-xs text-text">{{ process.stage?.label || 'N/A' }}</span>
                </div>

                <div class="flex items-start justify-between gap-2">
                  <span class="text-xs font-medium text-subtle">Tipo de proceso:</span>
                  <span class="text-xs text-text">{{ process.processType?.label || 'Sin clasificar' }}</span>
                </div>

                <div class="flex items-start justify-between gap-2">
                  <span class="text-xs font-medium text-subtle">Riesgo:</span>
                  <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                    [class]="getCatalogBadgeClasses(process.riskLevel?.color)">
                    {{ process.riskLevel?.label || 'N/A' }}
                  </span>
                </div>

                @if (process.advisors && process.advisors.length > 0) {
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-xs font-medium text-subtle">Asesores:</span>
                    <div class="flex flex-col items-end gap-1">
                      @for (advisor of process.advisors; track advisor.id) {
                        <span class="text-xs text-text">
                          {{ advisor.user?.firstName }} {{ advisor.user?.lastName }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <div class="flex items-start justify-between gap-2">
                  <span class="text-xs font-medium text-subtle">Actualizado:</span>
                  <span class="text-xs text-muted">{{ formatDate(process.updatedAt) }}</span>
                </div>
              </div>

              <!-- Acciones mobile -->
              <div class="grid grid-cols-2 gap-2 border-t border-default pt-3">
                <a
                  [routerLink]="['/procesos', process.id]"
                  class="flex items-center justify-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface-sunken"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  Ver detalle
                </a>
                <button
                  type="button"
                  (click)="delete.emit(process)"
                  class="flex items-center justify-center gap-2 rounded-md bg-danger-tint px-3 py-2 text-xs font-semibold text-danger transition hover:opacity-80"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ProcessesTableComponent {
  processes = input.required<LegalProcessResponse[]>();
  isLoading = input(false);
  /** F36 (ola 5): si el usuario tiene legal_processes.view.all — gobierna el
   * texto explicativo para quien no lo tiene, mismo patrón que
   * DocumentsListComponent (F30). */
  hasFullAccess = input(false);

  delete = output<LegalProcessResponse>();

  protected readonly formatDate = formatDate;
  protected readonly getStatusLabel = getStatusLabel;
  protected readonly getStatusClasses = getStatusClasses;
  protected readonly getStatusDot = getStatusDot;
  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;
  protected readonly ClientMatterStatus = ClientMatterStatus;
  protected readonly matterStatusLabel = matterStatusLabel;
  protected readonly matterStatusClasses = matterStatusClasses;
}
