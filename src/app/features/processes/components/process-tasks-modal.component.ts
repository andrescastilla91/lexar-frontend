import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { TaskPriority, TaskResponse, TaskTemplateResponse } from '../../../core/models/task.model';
import { TaskStatusResponse } from '../../../core/models/task-status.model';
import { TaskStatusControlComponent } from '../../../shared/components/task-status-control/task-status-control.component';
import { TaskEditModalComponent } from '../../tasks/components/task-edit-modal.component';
import { formatDate } from '../utils/process-format.utils';
import {
  getTaskPriorityClasses,
  getTaskPriorityLabel,
} from '../../../core/utils/task-format.util';

type TasksModalTab = 'list' | 'new' | 'template';

/**
 * Panel "Tareas" del detalle de proceso (F14, reestructurado 2026-08-05
 * por feedback de UX: el diseño original apilaba banner de plantilla +
 * formulario de creación + listado siempre visibles en un solo scroll,
 * lo que se sentía sobrecargado — ver "Desviaciones" en
 * F14-tareas-workflows.md). Ahora son 3 pestañas: el listado es la vista
 * por defecto (lo que se consulta más seguido); crear tarea e instanciar
 * plantilla son acciones explícitas que solo muestran su formulario
 * cuando el usuario las pide.
 *
 * El control de estado + bitácora por tarea (select, anotación pendiente,
 * adjuntos, historial) vive en TaskStatusControlComponent, compartido con
 * "Mis tareas" — feedback 2026-08-06 punto 4: dos implementaciones casi
 * idénticas del mismo control ya empezaban a divergir en cada ajuste.
 */
@Component({
  selector: 'app-process-tasks-modal',
  standalone: true,
  imports: [ReactiveFormsModule, TaskStatusControlComponent, TaskEditModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          class="w-full max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col rounded-lg border border-default bg-surface shadow-2xl overflow-hidden max-h-[90vh]"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-default p-6 pb-0">
            <div>
              <h3 class="text-lg font-semibold text-text">Tareas</h3>
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

          <!-- Tabs -->
          <div class="flex gap-4 border-b border-default px-6 pt-4">
            <button
              type="button"
              (click)="activeTab.set('list')"
              class="border-b-2 px-1 pb-3 text-sm font-medium transition"
              [class.border-navy-900]="activeTab() === 'list'"
              [class.text-text]="activeTab() === 'list'"
              [class.border-transparent]="activeTab() !== 'list'"
              [class.text-subtle]="activeTab() !== 'list'"
            >
              Listado ({{ tasks().length }})
            </button>
            <button
              type="button"
              (click)="activeTab.set('new')"
              class="border-b-2 px-1 pb-3 text-sm font-medium transition"
              [class.border-navy-900]="activeTab() === 'new'"
              [class.text-text]="activeTab() === 'new'"
              [class.border-transparent]="activeTab() !== 'new'"
              [class.text-subtle]="activeTab() !== 'new'"
            >
              Nueva tarea
            </button>
            @if (templates().length > 0) {
              <button
                type="button"
                (click)="activeTab.set('template')"
                class="border-b-2 px-1 pb-3 text-sm font-medium transition"
                [class.border-navy-900]="activeTab() === 'template'"
                [class.text-text]="activeTab() === 'template'"
                [class.border-transparent]="activeTab() !== 'template'"
                [class.text-subtle]="activeTab() !== 'template'"
              >
                Desde plantilla
              </button>
            }
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            @switch (activeTab()) {
              @case ('new') {
                <form class="grid gap-4" [formGroup]="form()" (ngSubmit)="onCreateSubmit()">
                  <label class="text-sm text-muted">
                    Título *
                    <input
                      formControlName="title"
                      type="text"
                      placeholder="Ej. Preparar poder especial"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                  </label>
                  <div class="grid gap-4 md:grid-cols-2">
                    <label class="text-sm text-muted">
                      Asignar a
                      <select
                        formControlName="assigneeUserId"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      >
                        <option value="">Sin asignar</option>
                        @for (advisor of advisors(); track advisor.id) {
                          @if (advisor.user) {
                            <option [value]="advisor.user.id">{{ advisor.user.firstName }} {{ advisor.user.lastName }}</option>
                          }
                        }
                      </select>
                    </label>
                    <label class="text-sm text-muted">
                      Vencimiento
                      <input
                        formControlName="dueAt"
                        type="datetime-local"
                        class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                      />
                    </label>
                  </div>

                  @if (errorMessage()) {
                    <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ errorMessage() }}</p>
                  }

                  <div class="flex gap-2">
                    <button
                      type="submit"
                      class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:opacity-50 disabled:cursor-not-allowed"
                      [disabled]="isSubmitting() || form().invalid"
                    >
                      Crear tarea
                    </button>
                  </div>
                </form>
              }
              @case ('template') {
                <div class="grid gap-3">
                  <p class="text-sm text-subtle">Crea automáticamente las tareas de un checklist predefinido.</p>
                  <div class="flex gap-2">
                    <select
                      #templateSelect
                      class="flex-1 rounded-md border border-default px-3 py-2 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    >
                      @for (template of templates(); track template.id) {
                        <option [value]="template.id">{{ template.name }}</option>
                      }
                    </select>
                    <button
                      type="button"
                      [disabled]="isInstantiating()"
                      (click)="instantiateTemplate.emit(templateSelect.value)"
                      class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Instanciar
                    </button>
                  </div>
                </div>
              }
              @default {
                @if (isLoading()) {
                  <div class="flex items-center justify-center py-8">
                    <div class="h-6 w-6 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
                  </div>
                } @else if (tasks().length === 0) {
                  <p class="rounded-lg border border-default bg-surface-muted p-6 text-center text-sm text-subtle">
                    No hay tareas registradas para este proceso
                  </p>
                } @else {
                  <div class="space-y-2">
                    @for (task of tasks(); track task.id) {
                      <div class="rounded-lg border border-default bg-surface p-3">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                              <p class="text-sm font-medium text-text truncate">{{ task.title }}</p>
                              <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getTaskPriorityClasses(task.priority)">
                                {{ getTaskPriorityLabel(task.priority) }}
                              </span>
                              @if (task.status.isTerminal) {
                                <span class="rounded-full border border-default bg-surface-muted px-2 py-0.5 text-xs font-semibold text-muted">
                                  Terminada
                                </span>
                              } @else if (task.pendingApproval; as pending) {
                                <span
                                  class="rounded-full border border-warning bg-warning-tint px-2 py-0.5 text-xs font-semibold text-warning"
                                  [title]="'Esperando aprobación para pasar a: ' + pending.toStatusLabel"
                                >
                                  En revisión → {{ pending.toStatusLabel }}
                                </span>
                              }
                            </div>
                            @if (task.dueAt) {
                              <p class="mt-1 text-xs text-subtle">{{ formatDate(task.dueAt) }}</p>
                            }
                            @if (task.assignee) {
                              <p class="mt-1 text-xs text-subtle">
                                Asignado a: <span class="text-text">{{ task.assignee.firstName }} {{ task.assignee.lastName }}</span>
                              </p>
                            }
                          </div>
                          <div class="flex flex-shrink-0 items-center gap-1">
                            <button
                              type="button"
                              [disabled]="task.status.isTerminal"
                              (click)="openEditModal(task)"
                              class="rounded-lg p-2 text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              [title]="task.status.isTerminal ? 'Tarea terminada: no se puede editar' : 'Editar tarea'"
                            >
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              [disabled]="task.status.isTerminal"
                              (click)="deleteTask.emit(task)"
                              class="rounded-lg p-2 text-danger transition hover:bg-danger-tint disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              [title]="task.status.isTerminal ? 'Tarea terminada: no se puede eliminar' : 'Eliminar tarea'"
                            >
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div class="mt-3">
                          <app-task-status-control
                            [task]="task"
                            [statuses]="statuses()"
                            [compact]="true"
                            (updated)="taskUpdated.emit($event)"
                          />
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            }
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

    <!-- F28: modal de edición, aparte del overlay principal -->
    <app-task-edit-modal
      [isOpen]="editModalOpen()"
      [task]="editingTask()"
      [advisors]="advisors()"
      (close)="closeEditModal()"
      (updated)="onTaskEdited($event)"
    />
  `,
})
export class ProcessTasksModalComponent {
  isOpen = input(false);
  processTitle = input<string | null>(null);
  isLoading = input(false);
  isSubmitting = input(false);
  isInstantiating = input(false);
  errorMessage = input<string | null>(null);
  tasks = input<TaskResponse[]>([]);
  advisors = input<AdvisorResponse[]>([]);
  templates = input<TaskTemplateResponse[]>([]);
  statuses = input<TaskStatusResponse[]>([]);
  form = input.required<FormGroup>();

  close = output<void>();
  submit = output<void>();
  /** Emitido por TaskStatusControlComponent tras un PATCH exitoso — el
   * padre (processes.component.ts) solo necesita reflejarlo en su lista
   * local de tareas del proceso, ya no arma el request. */
  taskUpdated = output<TaskResponse>();
  deleteTask = output<TaskResponse>();
  instantiateTemplate = output<string>();

  protected readonly TaskPriority = TaskPriority;
  protected readonly formatDate = formatDate;
  protected readonly getTaskPriorityClasses = getTaskPriorityClasses;
  protected readonly getTaskPriorityLabel = getTaskPriorityLabel;

  readonly activeTab = signal<TasksModalTab>('list');

  // F28: modal de edición, aparte del propio TaskEditModalComponent
  // (autocontenido, hace su propio PATCH) — emite `taskUpdated` con el
  // resultado, mismo output que ya usa TaskStatusControlComponent, así el
  // padre no necesita distinguir de dónde vino el cambio.
  readonly editingTask = signal<TaskResponse | null>(null);
  readonly editModalOpen = signal(false);

  onCreateSubmit(): void {
    this.submit.emit();
  }

  openEditModal(task: TaskResponse): void {
    this.editingTask.set(task);
    this.editModalOpen.set(true);
  }

  closeEditModal(): void {
    this.editModalOpen.set(false);
  }

  onTaskEdited(updated: TaskResponse): void {
    this.taskUpdated.emit(updated);
  }
}
