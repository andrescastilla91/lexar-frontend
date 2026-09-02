import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormModalShellComponent } from '../../../core/components/form-modal-shell.component';
import { TasksService } from '../../../core/services/tasks.service';
import { ToastService } from '../../../core/services/toast.service';
import { TaskPriority, TaskResponse, UpdateTaskRequest } from '../../../core/models/task.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';

/** Convierte un ISO string a formato `datetime-local` (hora del navegador),
 * para prellenar el input. Inversa de `new Date(value).toISOString()`, que
 * ya usa el formulario de creación. */
function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * F28 — edición de una tarea existente (título, descripción, prioridad,
 * fecha límite, responsable). Autocontenido como `TaskStatusControlComponent`:
 * llama a `TasksService.update` directamente y muestra el toast, en vez de
 * delegar el PATCH al consumidor — ambos puntos de entrada (panel de "Mis
 * tareas" y modal de tareas de un proceso) solo necesitan abrir/cerrar y
 * refrescar su lista local con el resultado.
 *
 * El backend ya rechaza (400) cualquier cambio si la tarea está en estado
 * terminal (`TasksService.update`, tasks.service.ts) — aquí se refleja esa
 * misma regla en la UI: formulario en solo lectura con explicación, en vez
 * de dejar que el usuario llene el formulario para recién enterarse al
 * guardar.
 */
@Component({
  selector: 'app-task-edit-modal',
  standalone: true,
  imports: [ReactiveFormsModule, FormModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-form-modal-shell
      title="Editar tarea"
      [isOpen]="isOpen()"
      [isSubmitting]="isSubmitting()"
      submitLabel="Guardar cambios"
      (cancel)="onCancel()"
      (submit)="submit()"
    >
      @if (task(); as t) {
        @if (t.status.isTerminal) {
          <p class="rounded-md border border-default bg-surface-muted px-3 py-2 text-sm text-muted">
            Esta tarea está finalizada — no admite cambios. Reábrela cambiando su estado para poder editarla.
          </p>
        } @else {
          <form [formGroup]="form" class="grid gap-4">
            <label class="text-sm text-muted">
              Título *
              <input
                formControlName="title"
                type="text"
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
                Responsable
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

            <label class="text-sm text-muted">
              Vencimiento
              <input
                formControlName="dueAt"
                type="datetime-local"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>

            @if (formError()) {
              <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ formError() }}</p>
            }
          </form>
        }
      }
    </app-form-modal-shell>
  `,
})
export class TaskEditModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);
  private readonly toast = inject(ToastService);

  isOpen = input(false);
  task = input<TaskResponse | null>(null);
  advisors = input<AdvisorResponse[]>([]);

  close = output<void>();
  updated = output<TaskResponse>();

  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);

  protected readonly TaskPriority = TaskPriority;

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    assigneeUserId: [''],
    priority: [TaskPriority.NORMAL],
    dueAt: [''],
  });

  constructor() {
    // Se resincroniza cada vez que se abre con una tarea distinta — no en
    // cada cambio de `task()` a secas, para no pisar lo que el usuario ya
    // escribió si el signal se recalcula mientras el modal sigue abierto.
    effect(() => {
      const t = this.task();
      if (!t || !this.isOpen()) {
        return;
      }
      this.formError.set(null);
      this.form.reset({
        title: t.title,
        description: t.description ?? '',
        assigneeUserId: t.assigneeUserId ?? '',
        priority: t.priority,
        dueAt: t.dueAt ? toDatetimeLocalValue(t.dueAt) : '',
      });
    });
  }

  onCancel(): void {
    this.close.emit();
  }

  submit(): void {
    const t = this.task();
    if (!t || this.isSubmitting() || t.status.isTerminal) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Completa los campos obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();

    // dueAt: si el usuario lo deja vacío, NO se manda la clave — el backend
    // interpreta dueAt=undefined como "sin cambios". No se manda `null`
    // porque `TasksService.update` hace `new Date(dto.dueAt)` sin validar
    // null primero (limitación existente, fuera del alcance de este fix:
    // "vaciar" el vencimiento desde aquí produciría 1970-01-01 en vez de
    // limpiarlo). assigneeUserId sí admite null para desasignar — el
    // backend ya lo soporta (`resolveAssignee` trata falsy como "sin
    // asignar").
    const request: UpdateTaskRequest = {
      title: v.title,
      description: v.description,
      assigneeUserId: (v.assigneeUserId || null) as unknown as string,
      priority: v.priority,
      ...(v.dueAt ? { dueAt: new Date(v.dueAt).toISOString() } : {}),
    };

    this.tasksService.update(t.id, request).subscribe({
      next: (updatedTask) => {
        this.isSubmitting.set(false);
        this.toast.success('Tarea actualizada correctamente.');
        this.updated.emit(updatedTask);
        this.close.emit();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.formError.set(error.message || 'Error al actualizar la tarea');
        this.toast.error(error.message || 'Error al actualizar la tarea');
      },
    });
  }
}
