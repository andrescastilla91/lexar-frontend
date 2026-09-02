import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TasksService } from '../../core/services/tasks.service';
import { TaskStatusesService } from '../../core/services/task-statuses.service';
import { AdvisorsService } from '../../core/services/advisors.service';
import { LegalProcessesService } from '../../core/services/legal-processes.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { AdvisorResponse } from '../../core/models/advisor-backend.model';
import { LegalProcessResponse } from '../../core/models/legal-process.model';
import {
  CreateTaskRequest,
  TaskPriority,
  TaskResponse,
} from '../../core/models/task.model';
import { TaskStatusResponse } from '../../core/models/task-status.model';
import { TaskStatusControlComponent } from '../../shared/components/task-status-control/task-status-control.component';
import { TaskApprovalsInboxComponent } from './components/task-approvals-inbox.component';
import { TaskEditModalComponent } from './components/task-edit-modal.component';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
// TaskActivityResponse ya no se usa aquí: la bitácora vive en
// TaskStatusControlComponent (ver punto 4 del feedback 2026-08-06).
import {
  getTaskPriorityClasses,
  getTaskPriorityLabel,
  getTaskStatusClasses,
  getTaskStatusLabel,
} from '../../core/utils/task-format.util';
import { formatDate } from '../processes/utils/process-format.utils';

interface TaskGroup {
  key: string;
  label: string;
  tasks: TaskResponse[];
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TaskStatusControlComponent,
    TaskApprovalsInboxComponent,
    TaskEditModalComponent,
    HasPermissionDirective,
  ],
  template: `
    <div class="space-y-6">
      <header
        class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-2xl font-semibold text-text">Tareas</h2>
          <p class="text-sm text-subtle">
            Trabajo asignado y seguimiento por proceso.
          </p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="openCreateModal()"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Nueva tarea
        </button>
      </header>

      <div *hasPermission="'tasks.approve'">
        <app-task-approvals-inbox (decided)="loadTasks()" />
      </div>

      @if (processes().length === 0) {
        <div
          class="rounded-lg border border-default bg-warning-tint px-4 py-3 text-sm text-warning"
        >
          Aún no tienes procesos registrados. Puedes crear tareas generales o
          <a routerLink="/procesos" class="font-semibold underline"
            >crear un proceso</a
          >
          para ligarlas a un caso.
        </div>
      }

      <!-- Filtros y toggle de vista -->
      <div
        class="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6 shadow-card md:flex-row md:items-end md:justify-between"
      >
        <form [formGroup]="filterForm" class="grid flex-1 gap-4 md:grid-cols-3">
          <label class="text-sm text-muted">
            Asignado a
            <select
              formControlName="assignee"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            >
              <option value="">Todos</option>
              @for (advisor of advisors(); track advisor.id) {
                @if (advisor.user) {
                  <option [value]="advisor.user.id">
                    {{ advisor.user.firstName }} {{ advisor.user.lastName }}
                  </option>
                }
              }
            </select>
          </label>
          <label class="text-sm text-muted">
            Proceso
            <select
              formControlName="processId"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            >
              <option value="">Todos</option>
              @for (process of processes(); track process.id) {
                <option [value]="process.id">{{ process.title }}</option>
              }
            </select>
          </label>
          <div class="flex items-end">
            <button
              type="button"
              (click)="toggleOnlyMine()"
              [disabled]="!currentUserId()"
              class="flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              [class]="
                onlyMine()
                  ? 'border-navy-900 bg-navy-900 text-white'
                  : 'border-default text-text hover:bg-surface-muted'
              "
            >
              Mis tareas
            </button>
          </div>
        </form>

        <div class="flex gap-2">
          <button
            type="button"
            (click)="viewMode.set('lista')"
            class="rounded-md border px-4 py-2 text-sm font-semibold transition"
            [class]="
              viewMode() === 'lista'
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-default text-text hover:bg-surface-muted'
            "
          >
            Lista
          </button>
          <button
            type="button"
            (click)="viewMode.set('tablero')"
            class="rounded-md border px-4 py-2 text-sm font-semibold transition"
            [class]="
              viewMode() === 'tablero'
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-default text-text hover:bg-surface-muted'
            "
          >
            Tablero
          </button>
        </div>
      </div>

      @if (isLoading()) {
        <p class="text-sm text-subtle">Cargando tareas…</p>
      } @else if (allTasks().length === 0) {
        <div
          class="rounded-lg border border-default bg-surface p-8 text-center shadow-card"
        >
          <p class="text-sm text-subtle">
            No hay tareas que coincidan con los filtros.
          </p>
        </div>
      } @else if (viewMode() === 'lista') {
        <div class="space-y-6">
          @for (group of taskGroups(); track group.key) {
            @if (group.tasks.length > 0) {
              <section>
                <h3
                  class="mb-2 text-sm font-semibold uppercase tracking-wide text-subtle"
                >
                  {{ group.label }} ({{ group.tasks.length }})
                </h3>
                <div
                  class="divide-y divide-default rounded-lg border border-default bg-surface shadow-card"
                >
                  @for (task of group.tasks; track task.id) {
                    <button
                      type="button"
                      (click)="openDetail(task)"
                      class="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-text">
                          {{ task.title }}
                        </p>
                        <p class="truncate text-xs text-subtle">
                          @if (task.process) {
                            {{ task.process.title }}
                          } @else {
                            Tarea general
                          }
                          @if (task.assignee) {
                            · {{ task.assignee.firstName }}
                            {{ task.assignee.lastName }}
                          }
                        </p>
                      </div>
                      <div class="flex shrink-0 items-center gap-2">
                        <span
                          class="rounded-full px-2 py-0.5 text-xs font-semibold"
                          [class]="getTaskPriorityClasses(task.priority)"
                        >
                          {{ getTaskPriorityLabel(task.priority) }}
                        </span>
                        <span
                          class="rounded-full px-2 py-0.5 text-xs font-semibold"
                          [class]="getTaskStatusClasses(task.status)"
                        >
                          {{ getTaskStatusLabel(task.status) }}
                        </span>
                        @if (task.pendingApproval; as pending) {
                          <span
                            class="rounded-full border border-warning bg-warning-tint px-2 py-0.5 text-xs font-semibold text-warning"
                            [title]="
                              'Esperando aprobación para pasar a: ' +
                              pending.toStatusLabel
                            "
                          >
                            En revisión → {{ pending.toStatusLabel }}
                          </span>
                        }
                        @if (task.dueAt) {
                          <span class="text-xs text-subtle">{{
                            formatDate(task.dueAt)
                          }}</span>
                        }
                      </div>
                    </button>
                  }
                </div>
              </section>
            }
          }
        </div>
      } @else {
        <div
          class="grid gap-4"
          [style.grid-template-columns]="
            'repeat(' + statuses().length + ', minmax(0, 1fr))'
          "
        >
          @for (column of statuses(); track column.id) {
            <div
              class="flex flex-col gap-3 rounded-lg border border-default bg-surface-muted p-3"
              (dragover)="$event.preventDefault()"
              (drop)="onDrop($event, column)"
            >
              <h3 class="text-sm font-semibold text-text">
                {{ column.label }} ({{ tasksByStatus(column.id)().length }})
              </h3>
              <div class="flex flex-col gap-2">
                @for (task of tasksByStatus(column.id)(); track task.id) {
                  <div
                    [attr.draggable]="isCardLocked(task) ? null : 'true'"
                    (dragstart)="onDragStart($event, task)"
                    (click)="openDetail(task)"
                    class="rounded-md border p-3 shadow-card transition hover:shadow-lg"
                    [class]="kanbanCardClasses(task)"
                    [title]="kanbanCardTitle(task)"
                  >
                    <p class="text-sm font-medium text-text">
                      {{ task.title }}
                    </p>
                    <p class="truncate text-xs text-subtle">
                      @if (task.process) {
                        {{ task.process.title }}
                      } @else {
                        Tarea general
                      }
                    </p>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-semibold"
                        [class]="getTaskPriorityClasses(task.priority)"
                      >
                        {{ getTaskPriorityLabel(task.priority) }}
                      </span>
                      @if (task.status.isTerminal) {
                        <span
                          class="rounded-full border border-default bg-surface-muted px-2 py-0.5 text-xs font-semibold text-muted"
                        >
                          Terminada
                        </span>
                      } @else if (task.pendingApproval; as pending) {
                        <span
                          class="rounded-full border border-warning bg-warning-tint px-2 py-0.5 text-xs font-semibold text-warning"
                        >
                          En revisión → {{ pending.toStatusLabel }}
                        </span>
                      }
                      @if (task.dueAt) {
                        <span class="text-xs text-subtle">{{
                          formatDate(task.dueAt)
                        }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Panel de detalle -->
    @if (selectedTask(); as task) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <div
          class="w-full max-w-md rounded-lg border border-default bg-surface p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          <div class="mb-4 flex items-start justify-between">
            <div>
              <h3 class="text-lg font-semibold text-text">{{ task.title }}</h3>
              @if (task.process) {
                <p class="text-sm text-subtle">{{ task.process.title }}</p>
              }
            </div>
            <button
              type="button"
              (click)="closeDetail()"
              class="rounded-md p-1 text-subtle hover:bg-surface-muted hover:text-muted"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold"
                [class]="getTaskPriorityClasses(task.priority)"
              >
                {{ getTaskPriorityLabel(task.priority) }}
              </span>
            </div>
            @if (task.dueAt) {
              <p class="text-sm text-text">
                Vence: {{ formatDate(task.dueAt) }}
              </p>
            }
            @if (task.description) {
              <p class="text-sm text-subtle">{{ task.description }}</p>
            }
            @if (task.assignee) {
              <p class="text-xs text-subtle">
                Asignado a:
                <span class="text-text"
                  >{{ task.assignee.firstName }}
                  {{ task.assignee.lastName }}</span
                >
              </p>
            }

            <app-task-status-control
              [task]="task"
              [statuses]="statuses()"
              (updated)="onTaskUpdated($event)"
            />
          </div>

          <div class="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              [disabled]="task.status.isTerminal"
              (click)="openEditModal(task)"
              [title]="
                task.status.isTerminal
                  ? 'Tarea terminada: no se puede editar'
                  : ''
              "
              class="flex-1 rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Editar
            </button>
            <button
              type="button"
              [disabled]="task.status.isTerminal"
              (click)="deleteTask(task)"
              [title]="
                task.status.isTerminal
                  ? 'Tarea terminada: no se puede eliminar'
                  : ''
              "
              class="flex-1 rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger-tint disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- F28: modal de edición — se abre cerrando el detalle (no apilan) -->
    <app-task-edit-modal
      [isOpen]="editModalOpen()"
      [task]="editingTask()"
      [advisors]="advisors()"
      (close)="closeEditModal()"
      (updated)="onTaskEdited($event)"
    />

    <!-- Modal de creación -->
    @if (createModalOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <form
          class="grid w-full max-w-lg gap-4 rounded-lg border border-default bg-surface p-4 shadow-2xl max-h-[90vh] overflow-y-auto md:p-6"
          [formGroup]="createForm"
          (ngSubmit)="submitCreate()"
        >
          <h3 class="text-lg font-semibold text-text">Nueva tarea</h3>

          <label class="text-sm text-muted">
            Título *
            <input
              formControlName="title"
              type="text"
              placeholder="Ej. Revisar contrato de arrendamiento"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>

          <label class="text-sm text-muted">
            Descripción
            <textarea
              formControlName="description"
              rows="2"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            ></textarea>
          </label>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="text-sm text-muted">
              Proceso
              <select
                formControlName="processId"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="">Ninguno (tarea general)</option>
                @for (process of processes(); track process.id) {
                  <option [value]="process.id">{{ process.title }}</option>
                }
              </select>
            </label>
            <label class="text-sm text-muted">
              Asignar a
              <select
                formControlName="assigneeUserId"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option value="">Sin asignar</option>
                @for (advisor of advisors(); track advisor.id) {
                  @if (advisor.user) {
                    <option [value]="advisor.user.id">
                      {{ advisor.user.firstName }} {{ advisor.user.lastName }}
                    </option>
                  }
                }
              </select>
            </label>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="text-sm text-muted">
              Vencimiento
              <input
                formControlName="dueAt"
                type="datetime-local"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="text-sm text-muted">
              Prioridad
              <select
                formControlName="priority"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option [value]="TaskPriority.LOW">Baja</option>
                <option [value]="TaskPriority.NORMAL">Normal</option>
                <option [value]="TaskPriority.HIGH">Alta</option>
              </select>
            </label>
          </div>

          @if (createError()) {
            <p
              class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger"
            >
              {{ createError() }}
            </p>
          }

          <div class="flex gap-2">
            <button
              type="submit"
              class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="isCreating() || createForm.invalid"
            >
              Crear tarea
            </button>
            <button
              type="button"
              (click)="closeCreateModal()"
              class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class TasksComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);
  private readonly taskStatusesService = inject(TaskStatusesService);
  private readonly advisorsService = inject(AdvisorsService);
  private readonly legalProcessesService = inject(LegalProcessesService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly advisors = signal<AdvisorResponse[]>([]);
  readonly processes = signal<LegalProcessResponse[]>([]);
  readonly allTasks = signal<TaskResponse[]>([]);
  readonly statuses = signal<TaskStatusResponse[]>([]);
  readonly isLoading = signal(false);
  readonly viewMode = signal<'lista' | 'tablero'>('lista');
  readonly selectedTask = signal<TaskResponse | null>(null);
  readonly editingTask = signal<TaskResponse | null>(null);
  readonly editModalOpen = signal(false);
  readonly createModalOpen = signal(false);
  readonly isCreating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly onlyMine = signal(false);
  private draggedTaskId: string | null = null;

  readonly currentUserId = computed(
    () => this.authService.currentUser()?.id ?? null,
  );

  protected readonly TaskPriority = TaskPriority;
  protected readonly formatDate = formatDate;
  protected readonly getTaskStatusClasses = getTaskStatusClasses;
  protected readonly getTaskStatusLabel = getTaskStatusLabel;
  protected readonly getTaskPriorityClasses = getTaskPriorityClasses;
  protected readonly getTaskPriorityLabel = getTaskPriorityLabel;

  readonly filterForm = this.fb.nonNullable.group({
    assignee: [''],
    processId: [''],
  });

  readonly createForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    processId: [''],
    assigneeUserId: [''],
    dueAt: [''],
    priority: [TaskPriority.NORMAL],
  });

  readonly taskGroups = computed<TaskGroup[]>(() => {
    const tasks = this.allTasks().filter((t) => !t.status.isTerminal);
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(
      startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    const groups: TaskGroup[] = [
      { key: 'overdue', label: 'Vencidas', tasks: [] },
      { key: 'today', label: 'Hoy', tasks: [] },
      { key: 'week', label: 'Esta semana', tasks: [] },
      { key: 'later', label: 'Luego', tasks: [] },
      { key: 'none', label: 'Sin fecha', tasks: [] },
    ];

    for (const task of tasks) {
      if (!task.dueAt) {
        groups[4].tasks.push(task);
        continue;
      }
      const due = new Date(task.dueAt);
      if (due < startOfToday) {
        groups[0].tasks.push(task);
      } else if (due < endOfToday) {
        groups[1].tasks.push(task);
      } else if (due < endOfWeek) {
        groups[2].tasks.push(task);
      } else {
        groups[3].tasks.push(task);
      }
    }

    for (const group of groups) {
      group.tasks.sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));
    }

    return groups;
  });

  constructor() {
    this.advisorsService.getAdvisors(1, 100).subscribe({
      next: (response) => this.advisors.set(response.advisors),
      error: (error) => console.error('Error loading advisors:', error),
    });
    this.legalProcessesService.getLegalProcesses(1, 100).subscribe({
      next: (response) => this.processes.set(response.legalProcesses),
      error: (error) => console.error('Error loading processes:', error),
    });
    this.taskStatusesService.getAll().subscribe({
      next: (statuses) => this.statuses.set(statuses),
      error: (error) => console.error('Error loading task statuses:', error),
    });

    this.filterForm.valueChanges.subscribe((value) => {
      if (this.onlyMine() && value.assignee !== this.currentUserId()) {
        this.onlyMine.set(false);
      }
      this.loadTasks();
    });

    this.loadTasks();
    this.openFromQueryParam();
  }

  /** F18 — al llegar desde un resultado de búsqueda global (?openId=), abre
   * el detalle de esa tarea aunque no esté en el filtro/página actual. */
  private openFromQueryParam(): void {
    const openId = this.route.snapshot.queryParamMap.get('openId');
    if (!openId) {
      return;
    }
    this.tasksService.getOne(openId).subscribe({
      next: (task) => this.openDetail(task),
      error: () => {},
    });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  tasksByStatus(statusId: string) {
    return computed(() =>
      this.allTasks().filter((t) => t.status.id === statusId),
    );
  }

  loadTasks(): void {
    this.isLoading.set(true);
    const filters = this.filterForm.getRawValue();
    this.tasksService
      .getAll({
        assignee: filters.assignee || undefined,
        processId: filters.processId || undefined,
      })
      .subscribe({
        next: (tasks) => {
          this.allTasks.set(tasks);
          this.isLoading.set(false);
          // Si hay un detalle abierto (p. ej. el usuario decidió una
          // aprobación desde la bandeja mientras miraba esta tarea), hay
          // que reemplazar la referencia stale por la fresca — si no, el
          // panel sigue mostrando el estado previo aunque la bitácora ya
          // registre el cambio (feedback 2026-08-06, punto 3).
          const selected = this.selectedTask();
          if (selected) {
            const fresh = tasks.find((t) => t.id === selected.id);
            if (fresh) {
              this.selectedTask.set(fresh);
            }
          }
        },
        error: (error) => {
          this.toast.error(error.message || 'Error al cargar las tareas');
          this.isLoading.set(false);
        },
      });
  }

  toggleOnlyMine(): void {
    const userId = this.currentUserId();
    if (!userId) {
      return;
    }
    const next = !this.onlyMine();
    this.onlyMine.set(next);
    this.filterForm.patchValue({ assignee: next ? userId : '' });
  }

  openDetail(task: TaskResponse): void {
    this.selectedTask.set(task);
  }

  closeDetail(): void {
    this.selectedTask.set(null);
  }

  /** F28 — cierra el detalle antes de abrir el modal de edición: son dos
   * overlays de pantalla completa, no tiene sentido apilarlos. */
  openEditModal(task: TaskResponse): void {
    this.selectedTask.set(null);
    this.editingTask.set(task);
    this.editModalOpen.set(true);
  }

  closeEditModal(): void {
    this.editModalOpen.set(false);
  }

  /** El modal de edición ya hizo el PATCH y mostró el toast — aquí solo se
   * refleja el resultado en el estado local, mismo patrón que
   * onTaskUpdated para el control de estado. */
  onTaskEdited(updated: TaskResponse): void {
    this.onTaskUpdated(updated);
  }

  /** El control de estado compartido (app-task-status-control) ya hizo el
   * PATCH y mostró el toast — aquí solo se refleja el resultado en el
   * estado local sin recargar todo el listado. */
  onTaskUpdated(updated: TaskResponse): void {
    this.allTasks.update((tasks) =>
      tasks.map((t) => (t.id === updated.id ? updated : t)),
    );
    if (this.selectedTask()?.id === updated.id) {
      this.selectedTask.set(updated);
    }
  }

  private applyStatusChange(task: TaskResponse, statusId: string): void {
    this.tasksService.update(task.id, { statusId }).subscribe({
      next: (updated) => {
        this.onTaskUpdated(updated);
        this.toast.success(
          updated.pendingApproval
            ? `Cambio enviado a aprobación: "${task.title}" sigue en "${task.status.label}" hasta que se decida.`
            : 'Tarea actualizada correctamente.',
        );
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al actualizar la tarea');
      },
    });
  }

  async deleteTask(task: TaskResponse): Promise<void> {
    if (task.status.isTerminal) {
      return;
    }
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar tarea',
      message: `¿Estás seguro de eliminar la tarea "${task.title}"?`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.tasksService.delete(task.id).subscribe({
      next: () => {
        this.toast.success('Tarea eliminada correctamente.');
        this.closeDetail();
        this.loadTasks();
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al eliminar la tarea');
      },
    });
  }

  /** Tarjeta bloqueada para drag/drop: ya sea porque tiene una solicitud de
   * aprobación pendiente, o porque su estado actual es terminal (una tarea
   * "terminada" queda congelada — feedback 2026-08-06). */
  isCardLocked(task: TaskResponse): boolean {
    return !!task.pendingApproval || task.status.isTerminal;
  }

  kanbanCardClasses(task: TaskResponse): string {
    if (task.status.isTerminal) {
      return 'cursor-pointer border-default bg-surface-muted opacity-75';
    }
    if (task.pendingApproval) {
      return 'cursor-pointer border-warning bg-warning-tint/40';
    }
    return 'cursor-grab active:cursor-grabbing border-default bg-surface';
  }

  kanbanCardTitle(task: TaskResponse): string {
    if (task.status.isTerminal) {
      return `Tarea terminada (${task.status.label}) — no admite más cambios`;
    }
    if (task.pendingApproval) {
      return `Esperando aprobación para pasar a: ${task.pendingApproval.toStatusLabel}`;
    }
    return '';
  }

  onDragStart(event: DragEvent, task: TaskResponse): void {
    if (this.isCardLocked(task)) {
      // Ya hay una solicitud pendiente o la tarea es terminal — no tiene
      // sentido dejar arrastrarla a otra columna (el backend la
      // rechazaría de todas formas).
      event.preventDefault();
      return;
    }
    this.draggedTaskId = task.id;
    event.dataTransfer?.setData('text/plain', task.id);
  }

  onDrop(event: DragEvent, column: TaskStatusResponse): void {
    event.preventDefault();
    const taskId =
      this.draggedTaskId ?? event.dataTransfer?.getData('text/plain');
    this.draggedTaskId = null;
    if (!taskId) {
      return;
    }
    const task = this.allTasks().find((t) => t.id === taskId);
    if (!task || task.status.id === column.id || this.isCardLocked(task)) {
      return;
    }

    if (column.requiresNote) {
      // No se puede "soltar y listo": abrimos el detalle para capturar la
      // anotación obligatoria con el control de estado compartido.
      this.openDetail(task);
      return;
    }

    this.applyStatusChange(task, column.id);
  }

  openCreateModal(): void {
    this.createError.set(null);
    this.createForm.reset({
      title: '',
      description: '',
      processId: '',
      assigneeUserId: '',
      dueAt: '',
      priority: TaskPriority.NORMAL,
    });
    this.createModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.createModalOpen.set(false);
    this.createError.set(null);
  }

  submitCreate(): void {
    if (this.isCreating()) {
      return;
    }
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const formValue = this.createForm.getRawValue();
    this.isCreating.set(true);
    this.createError.set(null);

    const request: CreateTaskRequest = {
      title: formValue.title,
      description: formValue.description || undefined,
      processId: formValue.processId || undefined,
      assigneeUserId: formValue.assigneeUserId || undefined,
      dueAt: formValue.dueAt
        ? new Date(formValue.dueAt).toISOString()
        : undefined,
      priority: formValue.priority,
    };

    this.tasksService.create(request).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.toast.success('Tarea creada correctamente.');
        this.closeCreateModal();
        this.loadTasks();
      },
      error: (error) => {
        this.createError.set(error.message || 'Error al crear la tarea');
        this.toast.error(error.message || 'Error al crear la tarea');
        this.isCreating.set(false);
      },
    });
  }
}
