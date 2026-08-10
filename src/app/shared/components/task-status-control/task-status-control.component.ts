import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { TaskResponse } from '../../../core/models/task.model';
import { TaskStatusResponse } from '../../../core/models/task-status.model';
import { TaskActivityResponse } from '../../../core/models/task-activity.model';
import { TasksService } from '../../../core/services/tasks.service';
import { FilesService } from '../../../core/services/files.service';
import { ToastService } from '../../../core/services/toast.service';
import { getTaskStatusClasses } from '../../../core/utils/task-format.util';
import { formatDate } from '../../../features/processes/utils/process-format.utils';

/**
 * Control de estado + bitácora de una tarea, compartido entre "Mis tareas"
 * (panel de detalle) y el modal de tareas de un proceso — antes eran dos
 * implementaciones casi idénticas (mismo selector, mismo panel de
 * anotación pendiente, misma bitácora) que empezaban a divergir con cada
 * ajuste (F14, feedback 2026-08-06, punto 4: "analizar si es óptimo tener
 * dos diseños... podría empezar a crecer más" — sí lo era, así que se
 * unificó en uno solo).
 *
 * Es autocontenido: llama a TasksService/FilesService directamente en vez
 * de recibir callbacks, porque ambos consumidores hacían exactamente lo
 * mismo (PATCH /tasks/:id) — solo difería el refresco posterior, que
 * queda a cargo de quien escuche `updated`.
 */
@Component({
  selector: 'app-task-status-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      @if (task().status.isTerminal) {
        <div class="rounded-md border border-default bg-surface-muted px-3 py-2 text-xs text-muted">
          <p class="font-semibold text-text">
            Tarea terminada — estado "{{ task().status.label }}"
          </p>
          <p class="mt-0.5">Ya no admite cambios de estado, anotaciones ni eliminación.</p>
        </div>
      } @else if (task().pendingApproval; as pending) {
        <div class="rounded-md border border-warning bg-warning-tint px-3 py-2 text-xs text-warning">
          <p class="font-semibold">A la espera de aprobación para pasar a "{{ pending.toStatusLabel }}"</p>
          <p class="mt-0.5">
            Solicitado por {{ pending.requestedBy ? pending.requestedBy.firstName + ' ' + pending.requestedBy.lastName : 'un usuario' }}
            · {{ formatDate(pending.createdAt) }}
          </p>
          @if (pending.note) {
            <p class="mt-1 rounded bg-surface px-2 py-1 text-text">{{ pending.note }}</p>
          }
          @if (pending.attachments.length > 0) {
            <ul class="mt-1 space-y-1">
              @for (attachment of pending.attachments; track attachment.fileId) {
                <li>
                  <button type="button" (click)="downloadAttachment(attachment.fileId)" class="text-primary underline">
                    {{ attachment.filename }}
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      } @else {
        <select
          [value]="task().status.id"
          (change)="onStatusSelect($any($event.target).value)"
          class="rounded-md font-semibold shadow-card"
          [class]="(compact() ? 'px-2 py-1 text-xs ' : 'mt-2 w-full px-3 py-2 text-sm ') + getTaskStatusClasses(task().status)"
        >
          @for (status of statuses(); track status.id) {
            <option [value]="status.id">{{ status.label }}</option>
          }
        </select>
      }

      @if (pendingStatus(); as target) {
        <div class="rounded-md border border-default bg-surface-muted p-3">
          <label class="text-xs font-semibold text-muted">
            @if (target.requiresNote) {
              El estado "{{ target.label }}" requiere una anotación *
            } @else {
              Anotación (opcional)
            }
            <textarea
              [value]="pendingNote()"
              (input)="pendingNote.set($any($event.target).value)"
              rows="2"
              placeholder="Ej. Cliente visitado, firmó recibido"
              class="mt-2 w-full rounded-md border border-default px-3 py-2 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            ></textarea>
          </label>

          <div class="mt-2">
            <label class="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary underline">
              Adjuntar evidencia
              <input type="file" multiple class="hidden" (change)="onFilesSelected($event)" />
            </label>
            @if (pendingFiles().length > 0) {
              <ul class="mt-1 space-y-1">
                @for (file of pendingFiles(); track file.name; let i = $index) {
                  <li class="flex items-center justify-between gap-2 rounded bg-surface px-2 py-1 text-xs text-text">
                    <span class="truncate">{{ file.name }}</span>
                    <button type="button" (click)="removeFile(i)" class="shrink-0 text-danger">Quitar</button>
                  </li>
                }
              </ul>
            }
          </div>

          @if (target.requiresApproval) {
            <p class="mt-2 text-xs text-subtle">
              Este cambio quedará a la espera de aprobación hasta que alguien habilitado lo decida.
            </p>
          }

          <div class="mt-2 flex gap-2">
            <button
              type="button"
              [disabled]="isSubmitting() || (target.requiresNote && !pendingNote().trim())"
              (click)="confirmChange()"
              class="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmar
            </button>
            <button
              type="button"
              [disabled]="isSubmitting()"
              (click)="cancelChange()"
              class="rounded-md border border-default px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface"
            >
              Cancelar
            </button>
          </div>
        </div>
      }

      <button type="button" (click)="toggleActivity()" class="text-xs font-semibold text-primary underline">
        {{ expandedActivity() ? 'Ocultar bitácora' : 'Ver bitácora' }}
      </button>

      @if (expandedActivity()) {
        <div class="rounded-md border border-default bg-surface-muted p-3">
          @if (isLoadingActivity()) {
            <p class="text-xs text-subtle">Cargando bitácora…</p>
          } @else if ((activity() ?? []).length === 0) {
            <p class="text-xs text-subtle">Sin actividad registrada.</p>
          } @else {
            <ul class="space-y-2">
              @for (entry of activity(); track entry.id) {
                <li class="text-xs text-subtle">
                  <span class="font-semibold text-text">{{ describeActivity(entry) }}</span>
                  @if (entry.actor) {
                    · {{ entry.actor.firstName }} {{ entry.actor.lastName }}
                  }
                  · {{ formatDate(entry.createdAt) }}
                  @if (entry.note) {
                    <p class="mt-1 rounded bg-surface px-2 py-1 text-text">{{ entry.note }}</p>
                  }
                  @if (entry.attachments.length > 0) {
                    <ul class="mt-1 space-y-1">
                      @for (attachment of entry.attachments; track attachment.fileId) {
                        <li>
                          <button type="button" (click)="downloadAttachment(attachment.fileId)" class="text-primary underline">
                            {{ attachment.filename }}
                          </button>
                        </li>
                      }
                    </ul>
                  }
                </li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
})
export class TaskStatusControlComponent {
  private readonly tasksService = inject(TasksService);
  private readonly filesService = inject(FilesService);
  private readonly toast = inject(ToastService);

  task = input.required<TaskResponse>();
  statuses = input<TaskStatusResponse[]>([]);
  /** Selector más pequeño para filas de listado (modal de proceso) vs. el
   * panel de detalle completo ("Mis tareas"). */
  compact = input(false);

  updated = output<TaskResponse>();

  readonly pendingStatusId = signal<string | null>(null);
  readonly pendingNote = signal('');
  readonly pendingFiles = signal<File[]>([]);
  readonly isSubmitting = signal(false);
  readonly expandedActivity = signal(false);
  readonly activity = signal<TaskActivityResponse[] | null>(null);
  readonly isLoadingActivity = signal(false);

  readonly pendingStatus = computed(() => {
    const id = this.pendingStatusId();
    if (!id) return null;
    return this.statuses().find((s) => s.id === id) ?? null;
  });

  protected readonly formatDate = formatDate;
  protected readonly getTaskStatusClasses = getTaskStatusClasses;

  onStatusSelect(statusId: string): void {
    const task = this.task();
    if (statusId === task.status.id) {
      return;
    }
    const target = this.statuses().find((s) => s.id === statusId);
    if (!target) {
      return;
    }
    if (target.requiresNote || target.requiresApproval) {
      this.pendingStatusId.set(statusId);
      this.pendingNote.set('');
      this.pendingFiles.set([]);
      return;
    }
    this.submit(statusId, undefined, undefined);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length > 0) {
      this.pendingFiles.update((current) => [...current, ...files]);
    }
    input.value = '';
  }

  removeFile(index: number): void {
    this.pendingFiles.update((current) => current.filter((_, i) => i !== index));
  }

  confirmChange(): void {
    const target = this.pendingStatus();
    if (!target || this.isSubmitting()) {
      return;
    }
    if (target.requiresNote && !this.pendingNote().trim()) {
      return;
    }
    this.submit(target.id, this.pendingNote().trim() || undefined, this.pendingFiles());
  }

  cancelChange(): void {
    this.pendingStatusId.set(null);
    this.pendingNote.set('');
    this.pendingFiles.set([]);
  }

  private submit(statusId: string, note: string | undefined, files: File[] | undefined): void {
    const task = this.task();
    this.isSubmitting.set(true);

    const uploadFiles$ = files && files.length > 0
      ? this.uploadAll(task.id, files)
      : Promise.resolve<string[] | undefined>(undefined);

    uploadFiles$
      .then((attachmentFileIds) => {
        this.tasksService.update(task.id, { statusId, note, attachmentFileIds }).subscribe({
          next: (updatedTask) => {
            this.isSubmitting.set(false);
            this.pendingStatusId.set(null);
            this.pendingNote.set('');
            this.pendingFiles.set([]);
            if (updatedTask.pendingApproval) {
              this.toast.success(
                `Cambio enviado a aprobación: "${task.title}" sigue en "${task.status.label}" hasta que se decida.`,
              );
            } else {
              this.toast.success('Tarea actualizada correctamente.');
            }
            this.updated.emit(updatedTask);
            if (this.expandedActivity()) {
              this.activity.set(null);
              this.loadActivity(task.id);
            }
          },
          error: (error) => {
            this.isSubmitting.set(false);
            this.toast.error(error.message || 'Error al actualizar la tarea');
          },
        });
      })
      .catch((error) => {
        this.isSubmitting.set(false);
        this.toast.error(error?.message || 'Error al subir los adjuntos');
      });
  }

  private uploadAll(taskId: string, files: File[]): Promise<string[]> {
    const uploads = files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          this.filesService.uploadFile(file, 'task', taskId).subscribe({
            next: (fileModel) => resolve(fileModel.id),
            error: (error) => reject(error),
          });
        }),
    );
    return Promise.all(uploads);
  }

  toggleActivity(): void {
    if (this.expandedActivity()) {
      this.expandedActivity.set(false);
      return;
    }
    this.expandedActivity.set(true);
    if (this.activity() !== null) {
      return;
    }
    this.loadActivity(this.task().id);
  }

  private loadActivity(taskId: string): void {
    this.isLoadingActivity.set(true);
    this.tasksService.getActivity(taskId).subscribe({
      next: (activity) => {
        this.activity.set(activity);
        this.isLoadingActivity.set(false);
      },
      error: () => {
        this.isLoadingActivity.set(false);
      },
    });
  }

  downloadAttachment(fileId: string): void {
    this.filesService.downloadFile(fileId).subscribe();
  }

  describeActivity(entry: TaskActivityResponse): string {
    switch (entry.type) {
      case 'CREATED':
        return 'Tarea creada';
      case 'ASSIGNED':
        return 'Tarea asignada';
      case 'UNASSIGNED':
        return 'Asignación removida';
      case 'STATUS_CHANGED':
        return `Estado: ${entry.fromStatusLabel ?? '—'} → ${entry.toStatusLabel ?? '—'}`;
      case 'DUE_CHANGED':
        return 'Vencimiento actualizado';
      case 'UPDATED':
        return 'Tarea actualizada';
      case 'DELETED':
        return 'Tarea eliminada';
      case 'APPROVAL_REQUESTED':
        return `Aprobación solicitada para "${entry.toStatusLabel ?? '—'}"`;
      case 'APPROVAL_APPROVED':
        return `Aprobación aceptada → ${entry.toStatusLabel ?? '—'}`;
      case 'APPROVAL_REJECTED':
        return 'Aprobación rechazada';
      default:
        return entry.type;
    }
  }
}
