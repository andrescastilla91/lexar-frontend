import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskStatusesService } from '../../../core/services/task-statuses.service';
import { TaskApprovalCandidate, TaskStatusResponse } from '../../../core/models/task-status.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PermissionsService } from '../../../core/services/permissions.service';
import { FormModalShellComponent } from '../../../core/components/form-modal-shell.component';
import { getCatalogBadgeClasses } from '../../../core/utils/catalog-badge.util';
import { PlanUpgradeService } from '../../../core/services/plan-upgrade.service';

const COLOR_OPTIONS = ['info', 'warning', 'success', 'danger', 'accent', 'primary'] as const;

@Component({
  selector: 'app-settings-task-statuses',
  standalone: true,
  imports: [ReactiveFormsModule, HasPermissionDirective, FormModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-4">
        <p class="text-sm text-subtle">
          Columnas del tablero de tareas. Puedes agregar estados propios (ej. "En revisión") y
          configurar si mover una tarea a un estado exige aprobación o una anotación de evidencia.
        </p>
        <button
          *hasPermission="'tasks.manage-statuses'"
          type="button"
          class="flex flex-shrink-0 items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
          (click)="openCreateModal()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo estado
        </button>
      </div>

      @if (isLoading()) {
        <p class="text-sm text-subtle">Cargando estados…</p>
      } @else {
        <div class="space-y-2">
          @for (status of statuses(); track status.id; let i = $index) {
            <div
              [attr.draggable]="canReorder() ? 'true' : null"
              (dragstart)="onDragStart($event, status.id)"
              (dragover)="$event.preventDefault()"
              (drop)="onDrop($event, i)"
              class="flex items-center justify-between gap-3 rounded-lg border border-default bg-surface p-4 shadow-card"
              [class.cursor-move]="canReorder()"
            >
              @if (canReorder()) {
                <div class="flex flex-shrink-0 flex-col" role="group" aria-label="Reordenar estado">
                  <button
                    type="button"
                    [disabled]="i === 0"
                    (click)="moveUp(i)"
                    class="rounded p-1 text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Subir"
                    title="Subir"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    [disabled]="i === statuses().length - 1"
                    (click)="moveDown(i)"
                    class="rounded p-1 text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Bajar"
                    title="Bajar"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
              }
              <div class="flex min-w-0 flex-1 items-center gap-3">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [class]="getCatalogBadgeClasses(status.color)">
                  {{ status.label }}
                </span>
                <div class="flex flex-wrap gap-1 text-xs text-subtle">
                  @if (status.isTerminal) {
                    <span class="rounded-full border border-default px-2 py-0.5">Estado final</span>
                  }
                  @if (status.requiresApproval) {
                    <span class="rounded-full border border-default px-2 py-0.5">
                      Requiere aprobación
                      @if (status.approvers.length > 0) {
                        · {{ status.approvers.length }} aprobador(es)
                      } @else {
                        · cualquiera con permiso
                      }
                    </span>
                  }
                  @if (status.requiresNote) {
                    <span class="rounded-full border border-default px-2 py-0.5">Requiere anotación</span>
                  }
                  @if (status.isSystem) {
                    <span class="rounded-full border border-default px-2 py-0.5">Del sistema</span>
                  }
                  @if (!status.isActive) {
                    <span class="rounded-full border border-danger px-2 py-0.5 text-danger">Inactivo</span>
                  }
                </div>
              </div>
              <div class="flex flex-shrink-0 items-center gap-1" *hasPermission="'tasks.manage-statuses'">
                <button
                  type="button"
                  (click)="openEditModal(status)"
                  class="rounded-lg p-2 text-muted transition hover:bg-surface-muted"
                  title="Editar estado"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                  </svg>
                </button>
                @if (!status.isSystem) {
                  <button
                    type="button"
                    (click)="deleteStatus(status)"
                    class="rounded-lg p-2 text-danger transition hover:bg-danger-tint"
                    title="Eliminar estado"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>

    <app-form-modal-shell
      [title]="editingStatus() ? 'Editar estado' : 'Nuevo estado'"
      [isOpen]="modalOpen()"
      [isSubmitting]="isSubmitting()"
      submitLabel="Guardar"
      (cancel)="closeModal()"
      (submit)="submit()"
    >
      <form [formGroup]="form" class="grid gap-4">
        @if (!editingStatus()) {
          <label class="text-sm text-muted">
            Código *
            <input
              formControlName="code"
              type="text"
              placeholder="ej. en_revision"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>

          <label class="text-sm text-muted">
            Posición
            <select
              formControlName="position"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            >
              @for (s of statuses(); track s.id; let i = $index) {
                <option [value]="i">Antes de "{{ s.label }}"</option>
              }
              <option [value]="statuses().length">Al final</option>
            </select>
          </label>
        }

        <label class="text-sm text-muted">
          Nombre *
          <input
            formControlName="label"
            type="text"
            placeholder="Ej. En revisión"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          />
        </label>

        <label class="text-sm text-muted">
          Color
          <select
            formControlName="color"
            class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
          >
            @for (color of colorOptions; track color) {
              <option [value]="color">{{ color }}</option>
            }
          </select>
        </label>

        <div class="space-y-2 rounded-lg border border-default bg-surface-muted p-3">
          <label class="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" formControlName="isTerminal" class="h-4 w-4 rounded border-default" />
            Es un estado final (cuenta como "tarea terminada")
          </label>
          <label class="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" formControlName="requiresApproval" class="h-4 w-4 rounded border-default" />
            Mover una tarea aquí requiere el permiso de aprobación
          </label>
          <label class="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" formControlName="requiresNote" class="h-4 w-4 rounded border-default" />
            Mover una tarea aquí exige dejar una anotación (evidencia)
          </label>
        </div>

        @if (form.value.requiresApproval) {
          <div class="space-y-2 rounded-lg border border-default bg-surface-muted p-3">
            <p class="text-xs font-semibold text-muted">
              Encargados de aprobar (opcional — si no eliges a nadie, cualquier usuario con el
              permiso "Aprobar tareas" podrá decidir)
            </p>
            @if (isLoadingCandidates()) {
              <p class="text-xs text-subtle">Cargando usuarios…</p>
            } @else if (approvalCandidates().length === 0) {
              <p class="text-xs text-subtle">
                Ningún usuario tiene el permiso "Aprobar tareas" todavía. Asígnalo desde Roles y
                permisos para poder elegir encargados específicos.
              </p>
            } @else {
              <div class="grid max-h-40 gap-1 overflow-y-auto">
                @for (candidate of approvalCandidates(); track candidate.id) {
                  <label class="flex items-center gap-2 text-sm text-text">
                    <input
                      type="checkbox"
                      [checked]="selectedApproverIds().has(candidate.id)"
                      (change)="toggleApprover(candidate.id)"
                      class="h-4 w-4 rounded border-default"
                    />
                    {{ candidate.firstName }} {{ candidate.lastName }}
                  </label>
                }
              </div>
            }
          </div>
        }

        @if (formError()) {
          <p class="rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ formError() }}</p>
        }
      </form>
    </app-form-modal-shell>
  `,
})
export class SettingsTaskStatusesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly taskStatusesService = inject(TaskStatusesService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly planUpgrade = inject(PlanUpgradeService);
  private readonly permissionsService = inject(PermissionsService);

  // F28: el drag es la comodidad, no el único camino — los botones
  // subir/bajar reproducen el mismo efecto y son operables por teclado
  // (capítulo 06 del Design System).
  readonly canReorder = computed(() => this.permissionsService.hasAnyPermission(['tasks.manage-statuses']));
  private draggedStatusId: string | null = null;

  readonly statuses = signal<TaskStatusResponse[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly modalOpen = signal(false);
  readonly editingStatus = signal<TaskStatusResponse | null>(null);

  readonly approvalCandidates = signal<TaskApprovalCandidate[]>([]);
  readonly isLoadingCandidates = signal(false);
  readonly selectedApproverIds = signal<Set<string>>(new Set());

  protected readonly colorOptions = COLOR_OPTIONS;
  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40), Validators.pattern(/^[a-z0-9_]+$/)]],
    label: ['', [Validators.required, Validators.maxLength(100)]],
    color: ['info'],
    isTerminal: [false],
    requiresApproval: [false],
    requiresNote: [false],
    /** Solo se usa al crear — índice de inserción, no un campo del backend.
     * Se traduce a un reorder() completo después de crear (ver submit). */
    position: [0],
  });

  ngOnInit(): void {
    this.loadStatuses();
    this.loadApprovalCandidates();
  }

  private loadApprovalCandidates(): void {
    this.isLoadingCandidates.set(true);
    this.taskStatusesService.getApprovalCandidates().subscribe({
      next: (candidates) => {
        this.approvalCandidates.set(candidates);
        this.isLoadingCandidates.set(false);
      },
      error: () => {
        this.isLoadingCandidates.set(false);
      },
    });
  }

  toggleApprover(userId: string): void {
    this.selectedApproverIds.update((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  loadStatuses(): void {
    this.isLoading.set(true);
    this.taskStatusesService.getAll().subscribe({
      next: (statuses) => {
        this.statuses.set(statuses);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al cargar los estados');
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.editingStatus.set(null);
    this.formError.set(null);
    this.selectedApproverIds.set(new Set());
    this.form.reset({
      code: '',
      label: '',
      color: 'info',
      isTerminal: false,
      requiresApproval: false,
      requiresNote: false,
      position: this.statuses().length,
    });
    this.form.get('code')?.enable();
    this.modalOpen.set(true);
  }

  openEditModal(status: TaskStatusResponse): void {
    this.editingStatus.set(status);
    this.formError.set(null);
    this.selectedApproverIds.set(new Set(status.approvers.map((a) => a.id)));
    this.form.reset({
      code: status.code,
      label: status.label,
      color: status.color ?? 'info',
      isTerminal: status.isTerminal,
      requiresApproval: status.requiresApproval,
      requiresNote: status.requiresNote,
      position: 0,
    });
    this.form.get('code')?.disable();
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.formError.set(null);
  }

  submit(): void {
    if (this.isSubmitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Completa los campos obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);
    const formValue = this.form.getRawValue();
    const editing = this.editingStatus();
    // Solo se manda la lista si requiresApproval está activo — si el
    // usuario la desmarca, no tiene sentido seguir guardando aprobadores.
    const approverUserIds = formValue.requiresApproval ? Array.from(this.selectedApproverIds()) : [];

    const request$ = editing
      ? this.taskStatusesService.update(editing.id, {
          label: formValue.label,
          color: formValue.color,
          isTerminal: formValue.isTerminal,
          requiresApproval: formValue.requiresApproval,
          requiresNote: formValue.requiresNote,
          approverUserIds,
        })
      : this.taskStatusesService.create({
          code: formValue.code,
          label: formValue.label,
          color: formValue.color,
          isTerminal: formValue.isTerminal,
          requiresApproval: formValue.requiresApproval,
          requiresNote: formValue.requiresNote,
          approverUserIds,
        });

    // F28: la posición elegida en el formulario de creación solo tiene
    // sentido si es "antes de" algún estado existente — si el usuario deja
    // "Al final" (el default), el orden que ya entrega el backend basta.
    const previousIds = this.statuses().map((s) => s.id);
    const insertAt = editing ? previousIds.length : formValue.position;

    request$.subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.toast.success(editing ? 'Estado actualizado correctamente.' : 'Estado creado correctamente.');
        this.closeModal();
        if (!editing && insertAt < previousIds.length) {
          this.reorderAfterCreate(created.id, insertAt, previousIds);
        } else {
          this.loadStatuses();
        }
      },
      error: (error) => {
        this.isSubmitting.set(false);
        // F7-R3: el toast+CTA de upgrade ya lo dispara error.interceptor.ts
        // de forma centralizada — aquí solo hace falta cerrar el modal.
        if (this.planUpgrade.isPlanGateError(error)) {
          this.closeModal();
          return;
        }
        this.formError.set(error.message || 'Error al guardar el estado');
        this.toast.error(error.message || 'Error al guardar el estado');
      },
    });
  }

  async deleteStatus(status: TaskStatusResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar estado',
      message: `¿Estás seguro de eliminar el estado "${status.label}"? Las tareas en este estado deben moverse primero.`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.taskStatusesService.delete(status.id).subscribe({
      next: () => {
        this.toast.success('Estado eliminado correctamente.');
        this.loadStatuses();
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al eliminar el estado');
      },
    });
  }

  onDragStart(event: DragEvent, statusId: string): void {
    if (!this.canReorder()) {
      return;
    }
    this.draggedStatusId = statusId;
    event.dataTransfer?.setData('text/plain', statusId);
  }

  onDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    if (!this.canReorder() || !this.draggedStatusId) {
      return;
    }
    const current = this.statuses();
    const sourceIndex = current.findIndex((s) => s.id === this.draggedStatusId);
    this.draggedStatusId = null;
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      return;
    }
    const reordered = [...current];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    this.persistOrder(reordered);
  }

  moveUp(index: number): void {
    if (index === 0) {
      return;
    }
    const reordered = [...this.statuses()];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    this.persistOrder(reordered);
  }

  moveDown(index: number): void {
    const current = this.statuses();
    if (index === current.length - 1) {
      return;
    }
    const reordered = [...current];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    this.persistOrder(reordered);
  }

  private persistOrder(reordered: TaskStatusResponse[]): void {
    const previous = this.statuses();
    // Optimista: la lista se ve reordenada de inmediato; si el backend
    // rechaza (ej. otro cambio concurrente), se revierte y se avisa.
    this.statuses.set(reordered);
    this.taskStatusesService.reorder(reordered.map((s) => s.id)).subscribe({
      next: (updated) => {
        this.statuses.set(updated);
        this.toast.success('Orden actualizado correctamente.');
      },
      error: (error) => {
        this.statuses.set(previous);
        this.toast.error(error.message || 'No se pudo actualizar el orden.');
      },
    });
  }

  private reorderAfterCreate(newStatusId: string, insertAt: number, previousIds: string[]): void {
    const ids = [...previousIds];
    ids.splice(insertAt, 0, newStatusId);
    this.taskStatusesService.reorder(ids).subscribe({
      next: (updated) => {
        this.statuses.set(updated);
      },
      error: (error) => {
        this.toast.error(error.message || 'No se pudo aplicar la posición elegida.');
        this.loadStatuses();
      },
    });
  }
}
