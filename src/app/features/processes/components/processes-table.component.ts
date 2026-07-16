import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LegalProcessResponse, ProcessStatus } from '../../../core/models/legal-process.model';
import {
  formatDate,
  getRiskClasses,
  getRiskLabel,
  getStageLabel,
  getStatusClasses,
  getStatusDot,
  getStatusLabel,
  getValidNextStatuses,
  isProcessEditable,
} from '../utils/process-format.utils';

@Component({
  selector: 'app-processes-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
      </div>
    } @else if (processes().length === 0) {
      <div class="rounded-lg border border-default bg-surface p-12 text-center">
        <p class="text-subtle">No hay procesos registrados</p>
      </div>
    } @else {
      <!-- Vista de Lista (Cards) -->
      <div class="space-y-4">
        @for (process of processes(); track process.id) {
          <div class="rounded-lg border border-default bg-surface p-6 shadow-card hover:shadow-card transition-shadow">
            <div class="space-y-4">
              <!-- Header: Título y Botones de Acción -->
              <div class="flex items-start justify-between gap-4">
                <!-- Título y Número de Caso -->
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-semibold text-text">{{ process.title }}</h3>
                  <p class="mt-1 font-mono text-sm text-subtle">
                    {{ process.caseNumber || 'Sin número de caso asignado' }}
                  </p>
                </div>

                <!-- Botones de Acción (solo iconos) -->
                <div class="flex items-center gap-2">
                  @if (isProcessEditable(process.status)) {
                    <button
                      type="button"
                      (click)="edit.emit(process)"
                      class="rounded-lg p-2 text-subtle transition hover:bg-surface-muted hover:text-text"
                      title="Editar proceso"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 3.487 3.65 3.65a1 1 0 0 1 0 1.415L8.96 20.104a1 1 0 0 1-.708.292H4.5a.75.75 0 0 1-.75-.75v-3.752a1 1 0 0 1 .293-.707L15.447 3.487a1 1 0 0 1 1.415 0Z" />
                      </svg>
                    </button>
                  }

                  @if (getValidNextStatuses(process.status).length > 0) {
                    <button
                      type="button"
                      (click)="changeStatus.emit(process)"
                      class="rounded-lg p-2 text-primary transition hover:bg-primary-tint"
                      title="Cambiar estado"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </button>
                  }

                  <button
                    type="button"
                    (click)="viewHistory.emit(process)"
                    class="rounded-lg p-2 text-accent transition hover:bg-accent-tint"
                    title="Ver historial"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </button>

                  @if (process.status === ProcessStatus.ACTIVE) {
                    <button
                      type="button"
                      (click)="annotate.emit(process)"
                      class="rounded-lg p-2 text-success transition hover:bg-success-tint"
                      title="Agregar anotación"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </button>
                  }

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
                  <p class="mt-1 text-sm text-text">{{ getStageLabel(process.stage) }}</p>
                </div>

                <!-- Riesgo -->
                <div>
                  <p class="text-xs font-medium text-subtle uppercase tracking-wide">Riesgo</p>
                  <span class="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    [class]="getRiskClasses(process.riskLevel)">
                    {{ getRiskLabel(process.riskLevel) }}
                  </span>
                </div>
              </div>

              <!-- Asesores y Fecha -->
              <div class="flex flex-wrap items-center gap-4 text-sm">
                <!-- Asesores -->
                @if (process.advisors && process.advisors.length > 0) {
                  <div class="flex items-center gap-2">
                    <svg class="h-4 w-4 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
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
                <p class="font-semibold text-text">{{ process.title }}</p>
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
                  <span class="text-xs text-text">{{ getStageLabel(process.stage) }}</span>
                </div>

                <div class="flex items-start justify-between gap-2">
                  <span class="text-xs font-medium text-subtle">Riesgo:</span>
                  <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                    [class]="getRiskClasses(process.riskLevel)">
                    {{ getRiskLabel(process.riskLevel) }}
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
                @if (isProcessEditable(process.status)) {
                  <button
                    type="button"
                    (click)="edit.emit(process)"
                    class="flex items-center justify-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface-sunken"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 3.487 3.65 3.65a1 1 0 0 1 0 1.415L8.96 20.104a1 1 0 0 1-.708.292H4.5a.75.75 0 0 1-.75-.75v-3.752a1 1 0 0 1 .293-.707L15.447 3.487a1 1 0 0 1 1.415 0Z" />
                    </svg>
                    Editar
                  </button>
                }
                @if (getValidNextStatuses(process.status).length > 0) {
                  <button
                    type="button"
                    (click)="changeStatus.emit(process)"
                    class="flex items-center justify-center gap-2 rounded-md bg-info-tint px-3 py-2 text-xs font-semibold text-info transition hover:opacity-80"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Estado
                  </button>
                }
                <button
                  type="button"
                  (click)="viewHistory.emit(process)"
                  class="flex items-center justify-center gap-2 rounded-md bg-accent-tint px-3 py-2 text-xs font-semibold text-accent transition hover:opacity-80"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Historial
                </button>
                @if (process.status === ProcessStatus.ACTIVE) {
                  <button
                    type="button"
                    (click)="annotate.emit(process)"
                    class="flex items-center justify-center gap-2 rounded-md bg-success-tint px-3 py-2 text-xs font-semibold text-success transition hover:opacity-80"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    Anotar
                  </button>
                }
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

  edit = output<LegalProcessResponse>();
  changeStatus = output<LegalProcessResponse>();
  viewHistory = output<LegalProcessResponse>();
  annotate = output<LegalProcessResponse>();
  delete = output<LegalProcessResponse>();

  protected readonly ProcessStatus = ProcessStatus;
  protected readonly formatDate = formatDate;
  protected readonly getStatusLabel = getStatusLabel;
  protected readonly getStatusClasses = getStatusClasses;
  protected readonly getStatusDot = getStatusDot;
  protected readonly getStageLabel = getStageLabel;
  protected readonly getRiskLabel = getRiskLabel;
  protected readonly getRiskClasses = getRiskClasses;
  protected readonly isProcessEditable = isProcessEditable;
  protected readonly getValidNextStatuses = getValidNextStatuses;
}
