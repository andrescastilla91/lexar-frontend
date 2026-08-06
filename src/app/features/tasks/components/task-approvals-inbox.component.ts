import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { TaskApprovalsService } from '../../../core/services/task-approvals.service';
import { FilesService } from '../../../core/services/files.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { TaskApprovalRequestResponse } from '../../../core/models/task-approval.model';
import { formatDate } from '../../processes/utils/process-format.utils';

/**
 * Bandeja de solicitudes de aprobación de tareas (F14, feedback
 * 2026-08-06 punto 1: antes un cambio a un estado "requiresApproval" solo
 * mostraba un 403 y no quedaba rastro de que alguien debía revisarlo).
 * Visible solo para quien tiene tasks.approve — el backend además filtra
 * a los aprobadores específicos configurados por estado, si los hay.
 */
@Component({
  selector: 'app-task-approvals-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface shadow-card">
      <button
        type="button"
        (click)="isOpen.set(!isOpen())"
        class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span class="text-sm font-semibold text-text">
          Aprobaciones pendientes
          @if (approvals().length > 0) {
            <span class="ml-1 rounded-full bg-warning-tint px-2 py-0.5 text-xs font-semibold text-warning">
              {{ approvals().length }}
            </span>
          }
        </span>
        <svg
          class="h-4 w-4 shrink-0 text-subtle transition"
          [class.rotate-180]="isOpen()"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      @if (isOpen()) {
        <div class="space-y-2 border-t border-default p-4">
          @if (isLoading()) {
            <p class="text-sm text-subtle">Cargando…</p>
          } @else if (approvals().length === 0) {
            <p class="text-sm text-subtle">No hay solicitudes pendientes.</p>
          } @else {
            @for (item of approvals(); track item.id) {
              <div class="rounded-md border border-default bg-surface-muted p-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-sm font-medium text-text">{{ item.taskTitle }}</p>
                  <span class="text-xs text-subtle">{{ formatDate(item.createdAt) }}</span>
                </div>
                <p class="mt-1 text-xs text-subtle">
                  {{ item.fromStatusLabel }} → {{ item.toStatusLabel }}
                  @if (item.processTitle) {
                    · {{ item.processTitle }}
                  }
                </p>
                <p class="mt-1 text-xs text-subtle">
                  Solicitado por {{ item.requestedBy ? item.requestedBy.firstName + ' ' + item.requestedBy.lastName : 'un usuario' }}
                </p>
                @if (item.note) {
                  <p class="mt-1 rounded bg-surface px-2 py-1 text-xs text-text">{{ item.note }}</p>
                }
                @if (item.attachments.length > 0) {
                  <ul class="mt-1 space-y-1">
                    @for (attachment of item.attachments; track attachment.fileId) {
                      <li>
                        <button type="button" (click)="downloadAttachment(attachment.fileId)" class="text-xs text-primary underline">
                          {{ attachment.filename }}
                        </button>
                      </li>
                    }
                  </ul>
                }
                <div class="mt-2 flex gap-2">
                  <button
                    type="button"
                    [disabled]="isDeciding().has(item.id)"
                    (click)="approve(item)"
                    class="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    [disabled]="isDeciding().has(item.id)"
                    (click)="reject(item)"
                    class="rounded-md border border-danger px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger-tint disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
})
export class TaskApprovalsInboxComponent implements OnInit {
  private readonly taskApprovalsService = inject(TaskApprovalsService);
  private readonly filesService = inject(FilesService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly isOpen = signal(false);
  readonly isLoading = signal(false);
  readonly approvals = signal<TaskApprovalRequestResponse[]>([]);
  readonly isDeciding = signal<Set<string>>(new Set());

  /** Para que quien la use pueda refrescar su propio listado de tareas —
   * decidir aquí cambia el estado real de la tarea en otra pantalla. */
  decided = output<void>();

  protected readonly formatDate = formatDate;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.taskApprovalsService.listPending().subscribe({
      next: (approvals) => {
        this.approvals.set(approvals);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al cargar las aprobaciones pendientes');
        this.isLoading.set(false);
      },
    });
  }

  downloadAttachment(fileId: string): void {
    this.filesService.downloadFile(fileId).subscribe();
  }

  approve(item: TaskApprovalRequestResponse): void {
    this.decide(item, true);
  }

  async reject(item: TaskApprovalRequestResponse): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Rechazar solicitud',
      message: `¿Rechazar el cambio de "${item.taskTitle}" a "${item.toStatusLabel}"?`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.decide(item, false);
  }

  private decide(item: TaskApprovalRequestResponse, approve: boolean): void {
    this.isDeciding.update((current) => new Set(current).add(item.id));
    this.taskApprovalsService.decide(item.id, { approve }).subscribe({
      next: () => {
        this.approvals.update((current) => current.filter((a) => a.id !== item.id));
        this.isDeciding.update((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
        this.toast.success(approve ? 'Solicitud aprobada correctamente.' : 'Solicitud rechazada.');
        this.decided.emit();
      },
      error: (error) => {
        this.isDeciding.update((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
        this.toast.error(error.message || 'Error al decidir la solicitud');
      },
    });
  }
}
