import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { TaskRecurrencesService } from '../../core/services/task-recurrences.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { AdvisorResponse } from '../../core/models/advisor-backend.model';
import {
  TaskRecurrenceResponse,
  TaskRecurrenceStatus,
} from '../../core/models/task-recurrence.model';
import { TaskResponse } from '../../core/models/task.model';
import {
  getRecurrenceFrequencyLabel,
  getRecurrenceStatusClasses,
  getRecurrenceStatusLabel,
  getTaskPriorityLabel,
} from '../../core/utils/task-format.util';
import { formatDate } from '../processes/utils/process-format.utils';
import { TaskRecurrenceEditModalComponent } from './components/task-recurrence-edit-modal.component';

type StatusFilter = TaskRecurrenceStatus | 'ALL';

/** YYYY-MM-DD → DD/MM/YYYY sin pasar por `Date` (evita el corrimiento de zona horaria). */
export function formatDateOnly(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * F42 (TAR-03) — administración de las series de tareas recurrentes: listado
 * por estado, ocurrencias de cada serie, edición (solo afecta a lo futuro) y
 * ciclo de vida: Detener (pausa reversible), Reanudar y Finalizar (cierre
 * definitivo). Detener y Finalizar conservan lo ya generado. Crear una serie
 * se hace desde "Nueva tarea → Repetir esta tarea".
 */
@Component({
  selector: 'app-task-recurrences',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TaskRecurrenceEditModalComponent],
  template: `
    <div class="space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-text">Tareas recurrentes</h2>
          <p class="text-sm text-subtle">
            Series que crean una tarea nueva en cada periodo. Para crear una,
            usa "Nueva tarea" y activa "Repetir esta tarea".
          </p>
        </div>
        <a
          routerLink="/tareas"
          class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
        >
          Volver a tareas
        </a>
      </header>

      <div class="rounded-lg border border-default bg-surface p-4 shadow-card md:p-6">
        <label class="text-sm text-muted">
          Estado
          <select
            [formControl]="statusFilter"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 sm:w-64"
          >
            <option value="ACTIVE">Activas</option>
            <option value="STOPPED">Detenidas</option>
            <option value="COMPLETED">Finalizadas</option>
            <option value="ALL">Todas</option>
          </select>
        </label>
      </div>

      @if (loadError()) {
        <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">
          {{ loadError() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-subtle">Cargando tareas recurrentes...</p>
      } @else if (recurrences().length === 0 && !loadError()) {
        <div class="rounded-lg border border-default bg-surface p-8 text-center text-sm text-subtle shadow-card">
          No hay tareas recurrentes en este estado.
        </div>
      }

      <ul class="space-y-4">
        @for (recurrence of recurrences(); track recurrence.id) {
          <li class="rounded-lg border border-default bg-surface p-4 shadow-card md:p-6">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0 space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate text-base font-semibold text-text">{{ recurrence.title }}</h3>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="statusClasses(recurrence.status)"
                  >
                    {{ statusLabel(recurrence.status) }}
                  </span>
                  <span class="rounded-full bg-info-tint px-2.5 py-0.5 text-xs font-medium text-info">
                    {{ frequencyLabel(recurrence.frequency) }}
                  </span>
                </div>
                <p class="text-xs text-subtle">
                  @if (recurrence.client) {
                    {{ recurrence.client.name }} ·
                  }
                  @if (recurrence.process) {
                    {{ recurrence.process.title }}
                  } @else {
                    Tarea general
                  }
                  @if (recurrence.assignee) {
                    · {{ recurrence.assignee.firstName }} {{ recurrence.assignee.lastName }}
                  }
                  · Prioridad {{ priorityLabel(recurrence) }}
                </p>
                <p class="text-sm text-muted">
                  {{ progressText(recurrence) }}
                  @if (recurrence.nextOccurrenceDate) {
                    · Próxima: {{ dateOnly(recurrence.nextOccurrenceDate) }} a las {{ recurrence.dueTime }}
                  } @else if (recurrence.status === Status.ACTIVE) {
                    · Sin próximas ocurrencias
                  }
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-md border border-default px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
                  (click)="toggleOccurrences(recurrence)"
                >
                  {{ expandedId() === recurrence.id ? 'Ocultar ocurrencias' : 'Ver ocurrencias' }}
                </button>
                @if (canEdit() && recurrence.status === Status.ACTIVE) {
                  <button
                    type="button"
                    class="rounded-md border border-default px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
                    (click)="openEdit(recurrence)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-default px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    [disabled]="isBusy()"
                    (click)="stop(recurrence)"
                  >
                    Detener
                  </button>
                }
                @if (canEdit() && recurrence.status === Status.STOPPED) {
                  <button
                    type="button"
                    class="rounded-md border border-default px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    [disabled]="isBusy()"
                    (click)="resume(recurrence)"
                  >
                    Reanudar
                  </button>
                }
                @if (canEdit() && recurrence.status !== Status.COMPLETED) {
                  <button
                    type="button"
                    class="rounded-md border border-danger px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger-tint disabled:cursor-not-allowed disabled:opacity-50"
                    [disabled]="isBusy()"
                    (click)="finalize(recurrence)"
                  >
                    Finalizar
                  </button>
                }
              </div>
            </div>

            @if (expandedId() === recurrence.id) {
              <div class="mt-4 border-t border-default pt-4">
                @if (occurrencesLoading()) {
                  <p class="text-sm text-subtle">Cargando ocurrencias...</p>
                } @else if (occurrences().length === 0) {
                  <p class="text-sm text-subtle">Aún no hay ocurrencias generadas.</p>
                } @else {
                  <ul class="divide-y divide-default">
                    @for (task of occurrences(); track task.id) {
                      <li class="flex flex-col gap-1 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span class="font-medium text-text">
                          Ocurrencia {{ task.occurrenceNumber }}
                        </span>
                        <span class="text-subtle">
                          {{ task.dueAt ? 'Vence ' + dateTime(task.dueAt) : 'Sin vencimiento' }}
                          · {{ task.status.label }}
                        </span>
                      </li>
                    }
                  </ul>
                }
              </div>
            }
          </li>
        }
      </ul>
    </div>

    <app-task-recurrence-edit-modal
      [isOpen]="editing() !== null"
      [recurrence]="editing()"
      [advisors]="advisors()"
      (close)="editing.set(null)"
      (updated)="onUpdated($event)"
    />
  `,
})
export class TaskRecurrencesComponent {
  private readonly recurrencesService = inject(TaskRecurrencesService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly permissionsService = inject(PermissionsService);

  readonly statusFilter = new FormControl<StatusFilter>(TaskRecurrenceStatus.ACTIVE, {
    nonNullable: true,
  });

  readonly recurrences = signal<TaskRecurrenceResponse[]>([]);
  readonly advisors = signal<AdvisorResponse[]>([]);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly editing = signal<TaskRecurrenceResponse | null>(null);
  /** Una sola acción de ciclo de vida (detener/reanudar/finalizar) a la vez. */
  readonly isBusy = signal(false);
  readonly expandedId = signal<string | null>(null);
  readonly occurrences = signal<TaskResponse[]>([]);
  readonly occurrencesLoading = signal(false);

  readonly canEdit = computed(() =>
    this.permissionsService.hasPermission('tasks.update'),
  );

  protected readonly Status = TaskRecurrenceStatus;
  protected readonly frequencyLabel = getRecurrenceFrequencyLabel;
  protected readonly statusLabel = getRecurrenceStatusLabel;
  protected readonly statusClasses = getRecurrenceStatusClasses;
  protected readonly dateOnly = formatDateOnly;
  protected readonly dateTime = formatDate;

  constructor() {
    this.advisorsService.getAdvisors(1, 100).subscribe({
      next: (response) => this.advisors.set(response.advisors),
      error: (error) => console.error('Error loading advisors:', error),
    });
    this.statusFilter.valueChanges.subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    const status = this.statusFilter.value;

    this.recurrencesService
      .getAll(status === 'ALL' ? undefined : { status })
      .subscribe({
        next: (recurrences) => {
          this.recurrences.set(recurrences);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.loadError.set(error.message || 'Error al cargar tareas recurrentes');
          this.isLoading.set(false);
        },
      });
  }

  priorityLabel(recurrence: TaskRecurrenceResponse): string {
    return getTaskPriorityLabel(recurrence.priority).toLowerCase();
  }

  progressText(recurrence: TaskRecurrenceResponse): string {
    const generated =
      recurrence.generatedCount === 1
        ? '1 ocurrencia generada'
        : `${recurrence.generatedCount} ocurrencias generadas`;
    if (recurrence.maxOccurrences !== null) {
      return `${generated} de ${recurrence.maxOccurrences}`;
    }
    if (recurrence.endDate) {
      return `${generated} · Termina el ${formatDateOnly(recurrence.endDate)}`;
    }
    return `${generated} · Sin fecha de fin`;
  }

  toggleOccurrences(recurrence: TaskRecurrenceResponse): void {
    if (this.expandedId() === recurrence.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(recurrence.id);
    this.occurrences.set([]);
    this.occurrencesLoading.set(true);
    this.recurrencesService.getOccurrences(recurrence.id).subscribe({
      next: (tasks) => {
        this.occurrences.set(tasks);
        this.occurrencesLoading.set(false);
      },
      error: (error) => {
        this.occurrencesLoading.set(false);
        this.toast.error(error.message || 'Error al cargar las ocurrencias');
      },
    });
  }

  openEdit(recurrence: TaskRecurrenceResponse): void {
    this.editing.set(recurrence);
  }

  onUpdated(updated: TaskRecurrenceResponse): void {
    this.recurrences.update((list) =>
      list.map((item) => (item.id === updated.id ? updated : item)),
    );
  }

  /** Detener = pausa reversible: no genera más hasta que se reanude. */
  async stop(recurrence: TaskRecurrenceResponse): Promise<void> {
    if (this.isBusy()) {
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: 'Detener tarea recurrente',
      message: `"${recurrence.title}" dejará de crear tareas nuevas mientras esté detenida. Las ya generadas se conservan y podrás reanudarla cuando quieras.`,
      confirmLabel: 'Detener',
    });
    if (!confirmed) {
      return;
    }

    this.runAction(
      this.recurrencesService.stop(recurrence.id),
      'Tarea recurrente detenida. Las ocurrencias existentes se conservan.',
      'Error al detener la tarea recurrente',
    );
  }

  /** Reanudar no pide confirmación: es reversible (se puede volver a detener). */
  resume(recurrence: TaskRecurrenceResponse): void {
    if (this.isBusy()) {
      return;
    }
    this.runAction(
      this.recurrencesService.resume(recurrence.id),
      'Tarea recurrente reanudada. Continúa desde su próxima fecha.',
      'Error al reanudar la tarea recurrente',
    );
  }

  /** Finalizar es definitivo (no se puede reanudar), por eso pide confirmación. */
  async finalize(recurrence: TaskRecurrenceResponse): Promise<void> {
    if (this.isBusy()) {
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: 'Finalizar tarea recurrente',
      message: `"${recurrence.title}" se cerrará de forma definitiva: no creará más tareas y no podrá reanudarse. Las ya generadas se conservan tal como están.`,
      confirmLabel: 'Finalizar',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.runAction(
      this.recurrencesService.finalize(recurrence.id),
      'Tarea recurrente finalizada. Las ocurrencias existentes se conservan.',
      'Error al finalizar la tarea recurrente',
    );
  }

  private runAction(
    action: Observable<TaskRecurrenceResponse>,
    successMessage: string,
    fallbackError: string,
  ): void {
    this.isBusy.set(true);
    action.subscribe({
      next: () => {
        this.isBusy.set(false);
        this.toast.success(successMessage);
        this.load();
      },
      error: (error) => {
        this.isBusy.set(false);
        this.toast.error(error.message || fallbackError);
      },
    });
  }
}
