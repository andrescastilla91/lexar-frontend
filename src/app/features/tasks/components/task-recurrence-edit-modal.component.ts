import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormModalShellComponent } from '../../../core/components/form-modal-shell.component';
import { TaskRecurrencesService } from '../../../core/services/task-recurrences.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  RecurrenceEndMode,
  TaskRecurrenceResponse,
  UpdateTaskRecurrenceRequest,
} from '../../../core/models/task-recurrence.model';
import { TaskPriority } from '../../../core/models/task.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { TaskRecurrenceFieldsComponent } from './task-recurrence-fields.component';
import {
  buildRuleUpdate,
  createRecurrenceForm,
} from '../utils/task-recurrence-form.util';

const INPUT_CLASSES =
  'mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30';

/**
 * F42 (TAR-03) — edición de una serie. Los cambios aplican solo a las
 * ocurrencias que todavía no se han generado; las ya creadas se editan como
 * cualquier tarea. Proceso, cliente y fecha de inicio no se editan.
 */
@Component({
  selector: 'app-task-recurrence-edit-modal',
  standalone: true,
  imports: [ReactiveFormsModule, FormModalShellComponent, TaskRecurrenceFieldsComponent],
  template: `
    <app-form-modal-shell
      title="Editar tarea recurrente"
      [isOpen]="isOpen()"
      [isSubmitting]="isSubmitting()"
      submitLabel="Guardar cambios"
      (cancel)="close.emit()"
      (submit)="submit()"
    >
      @if (recurrence(); as r) {
        <div class="grid gap-4">
          <p class="rounded-md border border-default bg-surface-muted px-3 py-2 text-xs text-subtle">
            Los cambios aplican a las próximas ocurrencias. Las que ya se
            generaron no se modifican: edítalas como cualquier tarea.
          </p>

          <form [formGroup]="form" class="grid gap-4">
            <label class="text-sm text-muted">
              Título *
              <input formControlName="title" type="text" [class]="inputClasses" />
            </label>

            <label class="text-sm text-muted">
              Descripción
              <textarea formControlName="description" rows="2" [class]="inputClasses"></textarea>
            </label>

            <div class="grid gap-4 md:grid-cols-2">
              <label class="text-sm text-muted">
                Responsable
                <select formControlName="assigneeUserId" [class]="inputClasses">
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
                <select formControlName="priority" [class]="inputClasses">
                  <option [value]="TaskPriority.LOW">Baja</option>
                  <option [value]="TaskPriority.NORMAL">Normal</option>
                  <option [value]="TaskPriority.HIGH">Alta</option>
                </select>
              </label>
            </div>

            <label class="text-sm text-muted">
              Hora de vencimiento
              <input formControlName="dueTime" type="time" [class]="inputClasses" />
            </label>
          </form>

          <app-task-recurrence-fields
            [form]="ruleForm"
            [showToggle]="false"
            [hint]="
              r.generatedCount > 0
                ? 'Ya se generaron ' + r.generatedCount + ' ocurrencias; el número total no puede ser menor.'
                : null
            "
          />

          @if (formError()) {
            <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">
              {{ formError() }}
            </p>
          }
        </div>
      }
    </app-form-modal-shell>
  `,
})
export class TaskRecurrenceEditModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recurrencesService = inject(TaskRecurrencesService);
  private readonly toast = inject(ToastService);

  isOpen = input(false);
  recurrence = input<TaskRecurrenceResponse | null>(null);
  advisors = input<AdvisorResponse[]>([]);

  close = output<void>();
  updated = output<TaskRecurrenceResponse>();

  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);

  protected readonly TaskPriority = TaskPriority;
  protected readonly inputClasses = INPUT_CLASSES;

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    assigneeUserId: [''],
    priority: [TaskPriority.NORMAL],
    dueTime: ['17:00', [Validators.required]],
  });

  readonly ruleForm = createRecurrenceForm(this.fb.nonNullable);

  constructor() {
    // Se resincroniza al abrir con otra serie, no en cada recálculo del signal.
    effect(() => {
      const r = this.recurrence();
      if (!r || !this.isOpen()) {
        return;
      }
      this.formError.set(null);
      this.form.reset({
        title: r.title,
        description: r.description ?? '',
        assigneeUserId: r.assigneeUserId ?? '',
        priority: r.priority,
        dueTime: r.dueTime,
      });
      const endMode: RecurrenceEndMode = r.endDate
        ? 'DATE'
        : r.maxOccurrences !== null
          ? 'COUNT'
          : 'NEVER';
      this.ruleForm.reset({
        repeat: true,
        frequency: r.frequency,
        endMode,
        endDate: r.endDate ?? '',
        maxOccurrences: r.maxOccurrences ?? 12,
      });
    });
  }

  submit(): void {
    const r = this.recurrence();
    if (!r || this.isSubmitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Completa los campos obligatorios.');
      return;
    }
    const rule = buildRuleUpdate(this.ruleForm.getRawValue());
    if (!rule.ok) {
      this.formError.set(rule.error);
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();

    const request: UpdateTaskRecurrenceRequest = {
      title: v.title,
      description: v.description || null,
      assigneeUserId: v.assigneeUserId || null,
      priority: v.priority,
      dueTime: v.dueTime,
      ...rule.value,
    };

    this.recurrencesService.update(r.id, request).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.toast.success('Tarea recurrente actualizada correctamente.');
        this.updated.emit(updated);
        this.close.emit();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.formError.set(error.message || 'Error al actualizar la tarea recurrente');
        this.toast.error(error.message || 'Error al actualizar la tarea recurrente');
      },
    });
  }
}
