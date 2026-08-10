import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { DeadlineResponse, DeadlineStatus } from '../../../core/models/deadline.model';
import { formatDate } from '../utils/process-format.utils';
import { getCatalogBadgeClasses } from '../../../core/utils/catalog-badge.util';
import { getDeadlineStatusClasses, getDeadlineStatusLabel } from '../../../core/utils/deadline-format.util';

@Component({
  selector: 'app-process-deadlines-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          class="w-full max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col rounded-lg border border-default bg-surface shadow-2xl overflow-hidden max-h-[90vh]"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-default p-6">
            <div>
              <h3 class="text-lg font-semibold text-text">Plazos y audiencias</h3>
              <p class="text-sm text-subtle">{{ processTitle() }}</p>
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="rounded-md p-2 text-subtle hover:bg-surface-muted hover:text-muted"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Formulario de creación -->
            <form class="grid gap-4 rounded-lg border border-default bg-surface-muted p-4" [formGroup]="form()" (ngSubmit)="submit.emit()">
              <h4 class="text-sm font-semibold text-text">Nuevo plazo</h4>
              <div class="grid gap-4 md:grid-cols-2">
                <label class="text-sm text-muted">
                  Título *
                  <input
                    formControlName="title"
                    type="text"
                    placeholder="Ej. Audiencia de conciliación"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                </label>
                <label class="text-sm text-muted">
                  Tipo *
                  <select
                    formControlName="typeId"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  >
                    <option value="">Seleccionar tipo</option>
                    @for (type of deadlineTypes(); track type.id) {
                      <option [value]="type.id">{{ type.label }}</option>
                    }
                  </select>
                </label>
              </div>
              <div class="grid gap-4 md:grid-cols-2">
                <label class="text-sm text-muted">
                  Fecha y hora *
                  <input
                    formControlName="dueAt"
                    type="datetime-local"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  />
                </label>
                <label class="mt-6 flex items-center gap-2 text-sm text-muted md:mt-8">
                  <input
                    formControlName="allDay"
                    type="checkbox"
                    class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-2 focus:ring-navy-900/30"
                  />
                  Todo el día
                </label>
              </div>
              <label class="text-sm text-muted">
                Notas
                <textarea
                  formControlName="notes"
                  rows="2"
                  placeholder="Detalles adicionales"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                ></textarea>
              </label>

              @if (advisors().length > 0) {
                <div class="text-sm text-muted">
                  <label class="mb-2 block">Asignar a</label>
                  <div class="max-h-32 overflow-y-auto rounded-md border border-default bg-surface p-2 shadow-card">
                    <div class="space-y-1">
                      @for (advisor of advisors(); track advisor.id) {
                        @if (advisor.user) {
                          <label class="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-surface-muted">
                            <input
                              type="checkbox"
                              [checked]="isAssigneeSelected(advisor.user.id)"
                              (change)="toggleAssignee.emit(advisor.user.id)"
                              class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-2 focus:ring-navy-900/30"
                            />
                            <span class="text-xs font-medium text-text">
                              {{ advisor.user.firstName }} {{ advisor.user.lastName }}
                            </span>
                          </label>
                        }
                      }
                    </div>
                  </div>
                </div>
              }

              @if (errorMessage()) {
                <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ errorMessage() }}</p>
              }

              <div class="flex gap-2">
                <button
                  type="submit"
                  class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed"
                  [disabled]="isSubmitting() || form().invalid"
                >
                  Crear plazo
                </button>
              </div>
            </form>

            <!-- Listado de plazos -->
            <div>
              <h4 class="mb-3 text-sm font-semibold text-text">Plazos registrados</h4>
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

          <!-- Footer -->
          <div class="border-t border-default p-4">
            <button
              type="button"
              (click)="close.emit()"
              class="w-full rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProcessDeadlinesModalComponent {
  isOpen = input(false);
  processTitle = input<string | null>(null);
  isLoading = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);
  deadlines = input<DeadlineResponse[]>([]);
  deadlineTypes = input<CatalogItem[]>([]);
  advisors = input<AdvisorResponse[]>([]);
  form = input.required<FormGroup>();

  close = output<void>();
  submit = output<void>();
  toggleAssignee = output<string>();
  markDone = output<DeadlineResponse>();
  deleteDeadline = output<DeadlineResponse>();

  protected readonly DeadlineStatus = DeadlineStatus;
  protected readonly formatDate = formatDate;
  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;
  protected readonly getDeadlineStatusClasses = getDeadlineStatusClasses;
  protected readonly getDeadlineStatusLabel = getDeadlineStatusLabel;

  isAssigneeSelected(userId: string): boolean {
    const selectedIds = this.form().get('assigneeUserIds')?.value || [];
    return selectedIds.includes(userId);
  }
}
